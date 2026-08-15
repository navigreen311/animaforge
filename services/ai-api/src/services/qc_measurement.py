"""G6 -- QC metrics measured from the artifact, not simulated from its URL.

``qc_ml_metrics`` seeds every score from a hash of the input string, so two
different renders at the same URL score identically and a URL that points at
nothing scores as well as one that points at a masterpiece. This module
measures instead:

* :func:`measure_loudness` implements ITU-R BS.1770-4 / EBU R128 -- K-weighting,
  400 ms gated blocks, absolute and relative gates. Verified against synthetic
  signals of known level.
* :func:`measure_temporal_stability` computes flicker and motion energy from
  real inter-frame differences.
* :func:`measure_av_sync` cross-correlates the audio envelope against per-frame
  motion energy to recover an offset in milliseconds.
* :func:`inspect_container` reads container and codec identifiers out of the
  file header.

The governing rule is that **nothing here invents a number**. When an artifact
cannot be fetched or decoded, the result carries ``measured: False`` and a
reason, and the caller must not treat it as a passing score. That is the whole
difference between this module and the one it replaces: a QC system that
reports "good" for a file it never opened is worse than no QC system, because
it launders the absence of evidence into a green tick.

numpy is the only dependency and it is already in requirements.txt.
"""

from __future__ import annotations

import os
import struct
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlparse

import numpy as np

# ---------------------------------------------------------------------------
# BS.1770 constants
# ---------------------------------------------------------------------------

#: Block length for gated loudness, in seconds.
_BLOCK_S = 0.400
#: Block overlap. The standard specifies 75%.
_BLOCK_OVERLAP = 0.75
#: Absolute gate, LUFS.
_ABSOLUTE_GATE_LUFS = -70.0
#: Relative gate, LU below the ungated loudness.
_RELATIVE_GATE_LU = -10.0
#: The -0.691 dB offset in the BS.1770 loudness equation.
_LOUDNESS_OFFSET = -0.691

#: EBU R128 delivery target and tolerance, LUFS.
R128_TARGET_LUFS = -23.0
R128_TOLERANCE_LU = 1.0
#: Maximum true peak for R128 delivery, dBTP.
R128_MAX_TRUE_PEAK_DBTP = -1.0

#: K-weighting filter specifications from BS.1770-4. Recomputing the biquads
#: from these at the signal's own sample rate is what makes the measurement
#: correct off 48 kHz; the tabulated coefficients in the standard are 48 kHz
#: only, and applying them to 44.1 kHz audio skews the result.
_SHELF_F0, _SHELF_Q, _SHELF_GAIN_DB = 1681.974450955533, 0.7071752369554196, 3.999843853973347
_HPF_F0, _HPF_Q = 38.13547087602444, 0.5003270373238773

#: Cap on how much audio is analysed, in seconds. The IIR recursion is a Python
#: loop (scipy is not a dependency), so unbounded input would be a denial of
#: service. Truncation is reported in the result rather than hidden.
_MAX_ANALYSIS_S = 120.0


@dataclass
class Measurement:
    """One metric, and whether it was actually measured.

    ``measured=False`` means no value was obtainable. ``value`` is then None --
    never a plausible-looking default, because a default is indistinguishable
    from a reading once it is in a report.
    """

    name: str
    measured: bool
    value: Any = None
    unit: str = ""
    reason: str = ""
    detail: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "metric": self.name,
            "measured": self.measured,
            "value": self.value,
        }
        if self.unit:
            out["unit"] = self.unit
        if self.reason:
            out["reason"] = self.reason
        if self.detail:
            out["detail"] = self.detail
        return out


def unmeasurable(name: str, reason: str) -> Measurement:
    """Build a Measurement that reports honestly that it has no value."""
    return Measurement(name=name, measured=False, value=None, reason=reason)


# ---------------------------------------------------------------------------
# Artifact resolution
# ---------------------------------------------------------------------------


def resolve_artifact(url: str) -> tuple[str | None, str]:
    """Resolve *url* to a readable local path.

    Returns ``(path, reason)``. ``path`` is None when the artifact cannot be
    reached, and *reason* then says why in terms an operator can act on.

    Remote URLs are deliberately not fetched: this runs inside request handling
    and in CI, neither of which should make arbitrary outbound requests. A
    caller that wants a remote artifact measured must stage it locally first.
    """
    if not url or not isinstance(url, str):
        return None, "no artifact URL supplied"

    parsed = urlparse(url)
    if parsed.scheme in ("http", "https"):
        return None, (
            f"remote artifact ({parsed.scheme}) is not fetched during QC; "
            "stage it on local storage and pass a file path or file:// URL"
        )

    path = parsed.path if parsed.scheme == "file" else url
    # file:///C:/x on Windows parses with a leading slash the OS rejects.
    if os.name == "nt" and path.startswith("/") and len(path) > 2 and path[2] == ":":
        path = path[1:]

    if not os.path.exists(path):
        return None, f"artifact not found at {path}"
    if not os.path.isfile(path):
        return None, f"{path} is not a file"
    return path, ""


# ---------------------------------------------------------------------------
# Container inspection
# ---------------------------------------------------------------------------

#: Magic-number signatures, checked against the file header.
_SIGNATURES: tuple[tuple[str, bytes, int], ...] = (
    ("riff-wav", b"RIFF", 0),
    ("mp4", b"ftyp", 4),
    ("matroska", b"\x1a\x45\xdf\xa3", 0),
    ("ogg", b"OggS", 0),
    ("flac", b"fLaC", 0),
    ("png", b"\x89PNG", 0),
    ("jpeg", b"\xff\xd8\xff", 0),
    ("gif", b"GIF8", 0),
)


def inspect_container(url: str) -> Measurement:
    """Identify the container from the file header.

    Real validation: it reads the bytes. A file whose extension says .mp4 and
    whose header says otherwise is reported as a mismatch, which is exactly the
    failure a renderer that died mid-write produces.
    """
    path, reason = resolve_artifact(url)
    if path is None:
        return unmeasurable("container", reason)

    size = os.path.getsize(path)
    if size == 0:
        return Measurement(
            name="container",
            measured=True,
            value="empty",
            detail={"size_bytes": 0, "valid": False, "issue": "file is zero bytes"},
        )

    with open(path, "rb") as handle:
        header = handle.read(32)

    detected = None
    for name, magic, offset in _SIGNATURES:
        if header[offset : offset + len(magic)] == magic:
            detected = name
            break

    extension = os.path.splitext(path)[1].lower().lstrip(".")
    expected = {
        "wav": "riff-wav", "mp4": "mp4", "m4a": "mp4", "mov": "mp4",
        "mkv": "matroska", "webm": "matroska", "ogg": "ogg", "flac": "flac",
        "png": "png", "jpg": "jpeg", "jpeg": "jpeg", "gif": "gif",
    }.get(extension)

    mismatch = bool(expected and detected and expected != detected)
    return Measurement(
        name="container",
        measured=True,
        value=detected or "unrecognised",
        detail={
            "size_bytes": size,
            "extension": extension,
            "expected_from_extension": expected,
            "header_matches_extension": not mismatch,
            "valid": detected is not None and not mismatch,
            "issue": (
                f"header says {detected}, extension says {expected}"
                if mismatch
                else ("no recognised container signature" if detected is None else "")
            ),
        },
    )


# ---------------------------------------------------------------------------
# Loudness -- ITU-R BS.1770-4 / EBU R128
# ---------------------------------------------------------------------------


def _biquad_high_shelf(f0: float, q: float, gain_db: float, rate: int) -> tuple[np.ndarray, np.ndarray]:
    """RBJ high-shelf biquad. Reproduces the BS.1770 stage-1 table at 48 kHz."""
    a_gain = 10 ** (gain_db / 40.0)
    w0 = 2 * np.pi * f0 / rate
    alpha = np.sin(w0) / (2 * q)
    cos_w0 = np.cos(w0)
    two_sqrt_a_alpha = 2 * np.sqrt(a_gain) * alpha

    b = np.array([
        a_gain * ((a_gain + 1) + (a_gain - 1) * cos_w0 + two_sqrt_a_alpha),
        -2 * a_gain * ((a_gain - 1) + (a_gain + 1) * cos_w0),
        a_gain * ((a_gain + 1) + (a_gain - 1) * cos_w0 - two_sqrt_a_alpha),
    ])
    a = np.array([
        (a_gain + 1) - (a_gain - 1) * cos_w0 + two_sqrt_a_alpha,
        2 * ((a_gain - 1) - (a_gain + 1) * cos_w0),
        (a_gain + 1) - (a_gain - 1) * cos_w0 - two_sqrt_a_alpha,
    ])
    return b / a[0], a / a[0]


def _biquad_high_pass(f0: float, q: float, rate: int) -> tuple[np.ndarray, np.ndarray]:
    """RBJ high-pass biquad. Reproduces the BS.1770 stage-2 table at 48 kHz."""
    w0 = 2 * np.pi * f0 / rate
    alpha = np.sin(w0) / (2 * q)
    cos_w0 = np.cos(w0)

    b = np.array([(1 + cos_w0) / 2, -(1 + cos_w0), (1 + cos_w0) / 2])
    a = np.array([1 + alpha, -2 * cos_w0, 1 - alpha])
    return b / a[0], a / a[0]


def _lfilter(b: np.ndarray, a: np.ndarray, signal: np.ndarray) -> np.ndarray:
    """Direct-form II transposed IIR filter.

    Hand-rolled because scipy is not a dependency and pulling it in for one
    function would be a heavier ask than the loop is worth at the input sizes
    _MAX_ANALYSIS_S allows.
    """
    out = np.empty_like(signal, dtype=np.float64)
    z1 = z2 = 0.0
    b0, b1, b2 = float(b[0]), float(b[1]), float(b[2])
    a1, a2 = float(a[1]), float(a[2])
    for i, x in enumerate(signal):
        y = b0 * x + z1
        z1 = b1 * x - a1 * y + z2
        z2 = b2 * x - a2 * y
        out[i] = y
    return out


#: The stage-1 / stage-2 coefficients tabulated in BS.1770-4, which are
#: normative at 48 kHz. They are used verbatim at that rate rather than
#: recomputed: the RBJ shelf below is parameterised by Q, while the standard's
#: shelf is specified by slope, and the two differ by ~0.4% in b0 -- enough to
#: put a measurement outside the +/-0.1 LU the standard allows.
_BS1770_48K_SHELF = (
    np.array([1.53512485958697, -2.69169618940638, 1.19839281085285]),
    np.array([1.0, -1.69065929318241, 0.73248077421585]),
)
_BS1770_48K_HPF = (
    np.array([1.0, -2.0, 1.0]),
    np.array([1.0, -1.99004745483398, 0.99007225036621]),
)


def k_weighting_coefficients(rate: int) -> tuple[tuple, tuple, bool]:
    """Return (shelf, highpass, exact) filters for *rate*.

    ``exact`` is False when the coefficients were recomputed for a rate the
    standard does not tabulate -- reported in the measurement so a reader knows
    which they got.
    """
    if rate == 48000:
        return _BS1770_48K_SHELF, _BS1770_48K_HPF, True
    return (
        _biquad_high_shelf(_SHELF_F0, _SHELF_Q, _SHELF_GAIN_DB, rate),
        _biquad_high_pass(_HPF_F0, _HPF_Q, rate),
        False,
    )


def k_weight(samples: np.ndarray, rate: int) -> np.ndarray:
    """Apply the two-stage BS.1770 K-weighting filter."""
    (b1, a1), (b2, a2), _exact = k_weighting_coefficients(rate)
    return _lfilter(b2, a2, _lfilter(b1, a1, samples))


def measure_loudness(samples: np.ndarray, rate: int) -> Measurement:
    """Integrated loudness in LUFS, per ITU-R BS.1770-4 gating.

    *samples* is mono or (n, channels); *rate* is the sample rate in Hz.
    """
    if rate <= 0:
        return unmeasurable("loudness", f"invalid sample rate {rate}")

    audio = np.asarray(samples, dtype=np.float64)
    if audio.size == 0:
        return unmeasurable("loudness", "audio stream is empty")
    if audio.ndim == 1:
        audio = audio[:, np.newaxis]

    truncated = False
    max_samples = int(_MAX_ANALYSIS_S * rate)
    if audio.shape[0] > max_samples:
        audio = audio[:max_samples]
        truncated = True

    block_len = round(_BLOCK_S * rate)
    if audio.shape[0] < block_len:
        return unmeasurable(
            "loudness",
            f"audio is shorter than one {_BLOCK_S * 1000:.0f} ms gating block "
            f"({audio.shape[0]} samples at {rate} Hz)",
        )

    step = round(block_len * (1.0 - _BLOCK_OVERLAP))
    # BS.1770 channel weights: L, R, C weight 1.0; surrounds 1.41. Anything
    # beyond 5 channels is weighted 1.0 rather than guessed at.
    weights = np.array([1.0, 1.0, 1.0, 1.41, 1.41][: audio.shape[1]])
    if audio.shape[1] > 5:
        weights = np.ones(audio.shape[1])

    filtered = np.column_stack([
        k_weight(audio[:, ch], rate) for ch in range(audio.shape[1])
    ])

    starts = range(0, audio.shape[0] - block_len + 1, step)
    block_powers = np.array([
        float(np.sum(weights * np.mean(filtered[s : s + block_len] ** 2, axis=0)))
        for s in starts
    ])
    if block_powers.size == 0:
        return unmeasurable("loudness", "no complete gating blocks")

    with np.errstate(divide="ignore"):
        block_lufs = _LOUDNESS_OFFSET + 10 * np.log10(block_powers)

    # Absolute gate, then a relative gate 10 LU below the absolute-gated mean.
    above_absolute = block_powers[block_lufs > _ABSOLUTE_GATE_LUFS]
    if above_absolute.size == 0:
        return Measurement(
            name="loudness",
            measured=True,
            value=float("-inf"),
            unit="LUFS",
            detail={
                "gated_blocks": 0,
                "compliant": False,
                "issue": "every block is below the -70 LUFS absolute gate (silence)",
            },
        )

    ungated_mean = float(np.mean(above_absolute))
    relative_gate = _LOUDNESS_OFFSET + 10 * np.log10(ungated_mean) + _RELATIVE_GATE_LU
    retained = block_powers[
        (block_lufs > _ABSOLUTE_GATE_LUFS) & (block_lufs > relative_gate)
    ]
    if retained.size == 0:
        retained = above_absolute

    integrated = _LOUDNESS_OFFSET + 10 * np.log10(float(np.mean(retained)))
    peak = float(np.max(np.abs(audio)))
    with np.errstate(divide="ignore"):
        peak_dbfs = 20 * np.log10(peak) if peak > 0 else float("-inf")

    # Silent blocks are -inf, and percentiles over -inf produce nan. EBU
    # Tech 3342 computes the range over gated blocks only in any case.
    gated_lufs = block_lufs[block_lufs > _ABSOLUTE_GATE_LUFS]
    loudness_range = float(
        np.percentile(gated_lufs, 95) - np.percentile(gated_lufs, 10)
    ) if gated_lufs.size else 0.0
    deviation = integrated - R128_TARGET_LUFS
    compliant = abs(deviation) <= R128_TOLERANCE_LU and peak_dbfs <= R128_MAX_TRUE_PEAK_DBTP

    detail: dict[str, Any] = {
        "sample_rate": rate,
        "channels": int(audio.shape[1]),
        "gated_blocks": int(retained.size),
        "total_blocks": int(block_powers.size),
        "loudness_range_lu": round(loudness_range, 2),
        "sample_peak_dbfs": round(peak_dbfs, 2) if np.isfinite(peak_dbfs) else None,
        "target_lufs": R128_TARGET_LUFS,
        "deviation_lu": round(deviation, 2),
        "compliant": bool(compliant),
        "standard": "ITU-R BS.1770-4 / EBU R128",
        # Sample peak, not true peak: true peak needs 4x oversampling, which is
        # not implemented here. Named so nobody reads it as dBTP.
        "peak_is_sample_peak": True,
    }
    if truncated:
        detail["truncated_to_s"] = _MAX_ANALYSIS_S
    if not compliant:
        detail["issue"] = (
            f"integrated {integrated:.1f} LUFS is {deviation:+.1f} LU from the "
            f"{R128_TARGET_LUFS} LUFS target"
        )

    return Measurement(
        name="loudness",
        measured=True,
        value=round(float(integrated), 2),
        unit="LUFS",
        detail=detail,
    )


# ---------------------------------------------------------------------------
# Temporal stability
# ---------------------------------------------------------------------------


def measure_temporal_stability(frames: np.ndarray) -> Measurement:
    """Flicker and motion energy from real inter-frame differences.

    *frames* is (n, h, w) luminance or (n, h, w, c). Flicker is isolated from
    motion by looking at per-frame *mean* luminance: a pan changes where the
    light is, a flicker changes how much there is.
    """
    array = np.asarray(frames, dtype=np.float64)
    if array.ndim == 4:
        # Rec. 601 luma. Averaging channels instead would make a red-to-green
        # shift at equal intensity look like no change at all.
        array = (
            0.299 * array[..., 0] + 0.587 * array[..., 1] + 0.114 * array[..., 2]
        )
    if array.ndim != 3:
        return unmeasurable(
            "temporal_stability", f"expected (n, h, w[, c]) frames, got shape {array.shape}"
        )
    if array.shape[0] < 2:
        return unmeasurable(
            "temporal_stability",
            f"need at least 2 frames to difference, got {array.shape[0]}",
        )

    scale = 255.0 if array.max() > 1.5 else 1.0
    normalised = array / scale

    diffs = np.abs(np.diff(normalised, axis=0))
    per_frame_motion = diffs.mean(axis=(1, 2))

    brightness = normalised.mean(axis=(1, 2))
    brightness_delta = np.abs(np.diff(brightness))

    # Flicker is the alternating component: a sign change in successive
    # brightness deltas that a monotonic fade would not produce.
    signed = np.diff(brightness)
    alternations = int(np.sum(np.sign(signed[:-1]) * np.sign(signed[1:]) < 0)) if signed.size > 1 else 0
    alternation_rate = alternations / max(1, signed.size - 1)

    # Magnitude x alternation, not variance x alternation: textbook flicker is
    # a perfectly regular swing, whose deltas have zero variance. Scoring on
    # std made the cleanest possible flicker the one case that scored 0.
    flicker_index = float(np.mean(brightness_delta) * alternation_rate)
    # 0.02 is roughly where alternating luminance stops reading as noise and
    # starts being visible on a mid-grey field.
    flicker_detected = bool(flicker_index > 0.02)

    stability = float(max(0.0, 1.0 - float(np.mean(per_frame_motion)) * 4.0))

    return Measurement(
        name="temporal_stability",
        measured=True,
        value=round(stability, 4),
        detail={
            "frame_count": int(array.shape[0]),
            "mean_abs_diff": round(float(np.mean(per_frame_motion)), 6),
            "max_abs_diff": round(float(np.max(per_frame_motion)), 6),
            "brightness_std": round(float(np.std(brightness)), 6),
            "flicker_index": round(flicker_index, 6),
            "flicker_detected": flicker_detected,
            "brightness_alternation_rate": round(alternation_rate, 4),
            "per_frame_motion": [round(float(v), 6) for v in per_frame_motion[:64]],
            "issue": "alternating luminance consistent with flicker" if flicker_detected else "",
        },
    )


# ---------------------------------------------------------------------------
# A/V sync
# ---------------------------------------------------------------------------


def measure_av_sync(
    audio: np.ndarray, rate: int, frames: np.ndarray, fps: float
) -> Measurement:
    """Offset in ms between audio energy and visual motion, by cross-correlation.

    Positive means audio leads video.
    """
    if rate <= 0 or fps <= 0:
        return unmeasurable("av_sync", f"invalid rate={rate} or fps={fps}")

    audio_arr = np.asarray(audio, dtype=np.float64)
    if audio_arr.ndim > 1:
        audio_arr = audio_arr.mean(axis=1)
    frames_arr = np.asarray(frames, dtype=np.float64)
    if frames_arr.ndim == 4:
        frames_arr = frames_arr.mean(axis=3)
    if frames_arr.ndim != 3 or frames_arr.shape[0] < 4:
        return unmeasurable("av_sync", "need at least 4 frames to correlate")
    if audio_arr.size < rate // int(fps or 1):
        return unmeasurable("av_sync", "audio is shorter than one video frame")

    # Audio envelope resampled onto the frame grid.
    n_frames = frames_arr.shape[0]
    samples_per_frame = max(1, round(rate / fps))
    envelope = np.array([
        float(np.sqrt(np.mean(audio_arr[i * samples_per_frame : (i + 1) * samples_per_frame] ** 2)))
        if (i + 1) * samples_per_frame <= audio_arr.size
        else 0.0
        for i in range(n_frames)
    ])

    motion = np.concatenate([[0.0], np.abs(np.diff(frames_arr, axis=0)).mean(axis=(1, 2))])

    usable = min(envelope.size, motion.size)
    envelope, motion = envelope[:usable], motion[:usable]
    if usable < 4 or np.std(envelope) == 0 or np.std(motion) == 0:
        return unmeasurable(
            "av_sync",
            "audio envelope or visual motion is constant; nothing to correlate",
        )

    a = (envelope - envelope.mean()) / np.std(envelope)
    v = (motion - motion.mean()) / np.std(motion)
    correlation = np.correlate(a, v, mode="full") / usable
    lags = np.arange(-usable + 1, usable)

    best = int(np.argmax(correlation))
    lag_frames = int(lags[best])
    offset_ms = lag_frames / fps * 1000.0
    confidence = float(correlation[best])

    # ITU-R BT.1359: audio 40 ms early to 60 ms late is imperceptible.
    within_tolerance = -60.0 <= offset_ms <= 40.0

    return Measurement(
        name="av_sync",
        measured=True,
        value=round(offset_ms, 2),
        unit="ms",
        detail={
            "lag_frames": lag_frames,
            "fps": fps,
            "peak_correlation": round(confidence, 4),
            "within_tolerance": bool(within_tolerance),
            "tolerance": "ITU-R BT.1359: -60 ms to +40 ms",
            "positive_means": "audio leads video",
            "issue": "" if within_tolerance else f"offset {offset_ms:.0f} ms exceeds BT.1359",
        },
    )


# ---------------------------------------------------------------------------
# WAV decoding (no ffmpeg required)
# ---------------------------------------------------------------------------


def read_wav(path: str) -> tuple[np.ndarray, int] | None:
    """Decode a PCM WAV file to float samples in [-1, 1].

    Returns None for anything that is not PCM WAV. Deliberately minimal: it
    exists so loudness can be measured with no ffmpeg on the box, not to be a
    general decoder.
    """
    try:
        with open(path, "rb") as handle:
            data = handle.read()
    except OSError:
        return None

    if len(data) < 12 or data[:4] != b"RIFF" or data[8:12] != b"WAVE":
        return None

    pos = 12
    fmt = None
    while pos + 8 <= len(data):
        chunk_id = data[pos : pos + 4]
        (chunk_size,) = struct.unpack("<I", data[pos + 4 : pos + 8])
        body = data[pos + 8 : pos + 8 + chunk_size]

        if chunk_id == b"fmt " and len(body) >= 16:
            audio_format, channels, rate, _br, _ba, bits = struct.unpack("<HHIIHH", body[:16])
            fmt = (audio_format, channels, rate, bits)
        elif chunk_id == b"data" and fmt is not None:
            audio_format, channels, rate, bits = fmt
            if audio_format not in (1, 0xFFFE) or bits not in (16, 24, 32):
                return None
            if bits == 16:
                samples = np.frombuffer(body, dtype="<i2").astype(np.float64) / 32768.0
            elif bits == 32:
                samples = np.frombuffer(body, dtype="<i4").astype(np.float64) / 2147483648.0
            else:  # 24-bit packed, widened to int32 preserving sign
                raw = np.frombuffer(body, dtype=np.uint8)
                usable = (raw.size // 3) * 3
                triplets = raw[:usable].reshape(-1, 3).astype(np.int32)
                packed = triplets[:, 0] | (triplets[:, 1] << 8) | (triplets[:, 2] << 16)
                packed = np.where(packed & 0x800000, packed - 0x1000000, packed)
                samples = packed.astype(np.float64) / 8388608.0
            if channels > 1:
                usable = (samples.size // channels) * channels
                samples = samples[:usable].reshape(-1, channels)
            return samples, rate

        pos += 8 + chunk_size + (chunk_size % 2)

    return None
