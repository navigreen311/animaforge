"""F3 music: generation through audiocraft's MusicGen.

The real adapter, and like video it is **gated**. MusicGen's small checkpoint
will run on CPU but takes minutes per clip; the medium and large ones need a
GPU. Either way it is a multi-gigabyte download, so it is not a default.

Output is written to storage as a real WAV, so a URL in a response always
refers to bytes that exist. The unprovisioned path returns no URL at all.

**Never executed.** Neither CI nor the machine this was written on has torch or
audiocraft. Written against audiocraft's documented API. See
``docs/generation-pipeline.md``.
"""

from __future__ import annotations

import io
import os
import struct
import wave
from dataclasses import dataclass
from typing import Any

from ..engines import EngineUnavailable, probe, upgrade_available

#: MusicGen checkpoint used when MUSIC_MODEL_ID is unset. `small` is the only
#: size that is merely slow rather than impossible without a GPU.
DEFAULT_MODEL_ID = "facebook/musicgen-small"

#: MusicGen emits 32 kHz mono.
SAMPLE_RATE = 32_000


@dataclass(frozen=True)
class MusicResult:
    """A cue that was actually generated and written."""

    url: str
    duration_ms: int
    sample_rate: int
    model_id: str
    sha256: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "url": self.url,
            "duration_ms": self.duration_ms,
            "sample_rate": self.sample_rate,
            "model_id": self.model_id,
            "sha256": self.sha256,
        }


def music_available() -> bool:
    """True when music generation can actually run on this host."""
    return upgrade_available("music")


def generate_music(prompt: str, *, job_id: str, duration_s: int = 15) -> MusicResult:
    """Generate a cue from a text prompt and write it to storage.

    Raises:
        EngineUnavailable: if torch/audiocraft or the weights are missing.
        ValueError: on an empty prompt or a non-positive duration.
    """
    if not prompt.strip():
        raise ValueError("prompt must not be empty")
    if duration_s < 1:
        raise ValueError(f"duration_s must be >= 1, got {duration_s}")

    status = probe("music")
    if not upgrade_available("music"):
        raise EngineUnavailable(
            "Music generation needs the gated music engine. Missing: "
            + ", ".join(status.missing)
        )

    # Imported lazily so torch never becomes a hard dependency of the CPU path.
    from audiocraft.models import MusicGen  # type: ignore[import-not-found]

    model_id = os.getenv("MUSIC_MODEL_ID", DEFAULT_MODEL_ID)
    model = MusicGen.get_pretrained(model_id)
    model.set_generation_params(duration=duration_s)

    waveforms = model.generate([prompt])
    samples = waveforms[0].detach().cpu().numpy()

    payload = _to_wav(samples, SAMPLE_RATE)

    from ..avatar.storage import store_artifact

    artifact = store_artifact(f"music/{job_id}/cue.wav", payload, "audio/wav")

    return MusicResult(
        url=artifact.url,
        duration_ms=int(samples.shape[-1] / SAMPLE_RATE * 1000),
        sample_rate=SAMPLE_RATE,
        model_id=model_id,
        sha256=artifact.sha256,
    )


def _to_wav(samples: Any, sample_rate: int) -> bytes:
    """Encode float samples in [-1, 1] as 16-bit PCM WAV.

    Uses the standard library rather than torchaudio's writer so the encode
    step has no extra dependency of its own.
    """
    import numpy as np

    array = np.asarray(samples, dtype=np.float32)
    if array.ndim > 1:
        array = array.reshape(-1)
    clipped = np.clip(array, -1.0, 1.0)
    pcm = (clipped * 32767.0).astype("<i2")

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(sample_rate)
        handle.writeframes(pcm.tobytes())
    return buffer.getvalue()


# Kept so a caller can validate a stored cue without a decoder dependency.
def wav_duration_ms(payload: bytes) -> int | None:
    """Return the duration of a RIFF/WAVE payload, or None if unparsable."""
    if len(payload) < 44 or payload[:4] != b"RIFF" or payload[8:12] != b"WAVE":
        return None
    try:
        with wave.open(io.BytesIO(payload), "rb") as handle:
            frames = handle.getnframes()
            rate = handle.getframerate()
    except (wave.Error, EOFError, struct.error):
        return None
    return int(frames / rate * 1000) if rate else None
