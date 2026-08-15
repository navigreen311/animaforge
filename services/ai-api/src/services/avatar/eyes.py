"""X5 Subsystem 4 — the eye system: saccades, blinks and pupil dilation.

Produces a real, sampled animation curve rather than a static parameter set.
:func:`simulate_eyes` returns per-frame gaze angles, eyelid aperture and pupil
diameter for a requested duration, plus the discrete event list that generated
them.  Everything runs on CPU and is deterministic for a given seed.

Saccades
    Amplitudes are drawn from the heavy-tailed distribution characteristic of
    natural viewing.  Peak velocity follows the **main sequence** (Bahill,
    Clark & Stark 1975)::

        Vpeak = Vmax * (1 - exp(-A / C))          Vmax ~ 700 deg/s, C ~ 10 deg

    Duration is derived from that peak velocity so the two stay consistent: a
    minimum-jerk trajectory of amplitude ``A`` over duration ``D`` peaks at
    ``1.875 * A / D``, hence ``D = 1.875 * A / Vpeak``.  The trajectory itself
    is the minimum-jerk polynomial ``10t^3 - 15t^4 + 6t^5``.  Between saccades
    the eye fixates, with fixation durations drawn from a lognormal.

Blinks
    Spontaneous blinks are a Poisson process with a refractory floor, at a
    configurable rate (~17/min at rest).  Each blink is an asymmetric
    waveform: a fast closing phase, a brief closed plateau and a slower
    reopening — the asymmetry is what makes a blink read as organic.

Pupil
    Steady-state diameter comes from the Stanley & Davies term of the Watson &
    Yellott (2012) unified formula::

        D(L, a) = 7.75 - 5.75 * ((L*a/846)^0.41 / ((L*a/846)^0.41 + 2))

    The pupil tracks that target through a first-order lag (light-reflex
    latency ~230 ms, time constant ~1 s), with low-amplitude *hippus*
    oscillation superimposed.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

#: Main-sequence saturation velocity and amplitude constant.
SACCADE_PEAK_VELOCITY_MAX = 700.0  # deg/s
SACCADE_AMPLITUDE_CONSTANT = 10.0  # deg

#: Oculomotor range actually used in natural viewing.
GAZE_LIMIT_YAW_DEG = 35.0
GAZE_LIMIT_PITCH_DEG = 25.0

#: Blink waveform phase durations, in seconds.
BLINK_CLOSING_S = 0.085
BLINK_CLOSED_S = 0.020
BLINK_OPENING_S = 0.165
BLINK_REFRACTORY_S = 0.5

#: Pupil light-reflex dynamics.
PUPIL_LATENCY_S = 0.23
PUPIL_TIME_CONSTANT_S = 1.0
HIPPUS_FREQUENCY_HZ = 0.18
HIPPUS_AMPLITUDE_MM = 0.12


@dataclass(frozen=True)
class SaccadeEvent:
    """One saccade, described by its main-sequence parameters."""

    onset_s: float
    duration_s: float
    amplitude_deg: float
    peak_velocity_deg_s: float
    from_yaw_deg: float
    from_pitch_deg: float
    to_yaw_deg: float
    to_pitch_deg: float

    def as_dict(self) -> dict[str, float]:
        return {
            "onset_s": round(self.onset_s, 4),
            "duration_s": round(self.duration_s, 4),
            "amplitude_deg": round(self.amplitude_deg, 4),
            "peak_velocity_deg_s": round(self.peak_velocity_deg_s, 3),
            "to_yaw_deg": round(self.to_yaw_deg, 3),
            "to_pitch_deg": round(self.to_pitch_deg, 3),
        }


@dataclass(frozen=True)
class BlinkEvent:
    """One spontaneous blink."""

    onset_s: float
    duration_s: float

    def as_dict(self) -> dict[str, float]:
        return {
            "onset_s": round(self.onset_s, 4),
            "duration_s": round(self.duration_s, 4),
        }


@dataclass
class EyeAnimation:
    """A sampled eye animation curve plus the events that produced it."""

    fps: float
    duration_s: float
    times_s: np.ndarray
    gaze_yaw_deg: np.ndarray
    gaze_pitch_deg: np.ndarray
    eyelid_closure: np.ndarray  # 0 = fully open, 1 = fully closed
    pupil_diameter_mm: np.ndarray
    saccades: list[SaccadeEvent] = field(default_factory=list)
    blinks: list[BlinkEvent] = field(default_factory=list)
    luminance_cd_m2: float = 50.0

    @property
    def frame_count(self) -> int:
        return int(self.times_s.shape[0])

    def blink_rate_per_min(self) -> float:
        if self.duration_s <= 0:
            return 0.0
        return len(self.blinks) / self.duration_s * 60.0

    def as_dict(self) -> dict[str, object]:
        """Serialise as an animation clip with per-frame channel samples."""
        return {
            "schema": "animaforge.eye-animation/1",
            "fps": self.fps,
            "duration_s": round(self.duration_s, 4),
            "frame_count": self.frame_count,
            "luminance_cd_m2": self.luminance_cd_m2,
            "channels": {
                "gaze_yaw_deg": _round_all(self.gaze_yaw_deg, 3),
                "gaze_pitch_deg": _round_all(self.gaze_pitch_deg, 3),
                "eyeBlinkLeft": _round_all(self.eyelid_closure, 4),
                "eyeBlinkRight": _round_all(self.eyelid_closure, 4),
                "pupil_diameter_mm": _round_all(self.pupil_diameter_mm, 4),
            },
            "events": {
                "saccades": [s.as_dict() for s in self.saccades],
                "blinks": [b.as_dict() for b in self.blinks],
            },
            "statistics": {
                "saccade_count": len(self.saccades),
                "blink_count": len(self.blinks),
                "blink_rate_per_min": round(self.blink_rate_per_min(), 3),
                "mean_saccade_amplitude_deg": round(
                    float(np.mean([s.amplitude_deg for s in self.saccades]))
                    if self.saccades
                    else 0.0,
                    3,
                ),
                "pupil_range_mm": [
                    round(float(self.pupil_diameter_mm.min()), 4),
                    round(float(self.pupil_diameter_mm.max()), 4),
                ],
            },
        }


def saccade_peak_velocity(amplitude_deg: float) -> float:
    """Main-sequence peak velocity for a saccade of the given amplitude."""
    if amplitude_deg <= 0:
        return 0.0
    return SACCADE_PEAK_VELOCITY_MAX * (
        1.0 - math.exp(-amplitude_deg / SACCADE_AMPLITUDE_CONSTANT)
    )


def saccade_duration(amplitude_deg: float) -> float:
    """Duration consistent with the main sequence and a min-jerk trajectory."""
    peak = saccade_peak_velocity(amplitude_deg)
    if peak <= 0:
        return 0.0
    return 1.875 * amplitude_deg / peak


def steady_state_pupil_diameter(
    luminance_cd_m2: float,
    field_area_deg2: float = 600.0,
) -> float:
    """Stanley & Davies pupil diameter in mm, as used by Watson & Yellott."""
    if luminance_cd_m2 < 0:
        raise ValueError("luminance must be non-negative")
    drive = (luminance_cd_m2 * field_area_deg2 / 846.0) ** 0.41
    return 7.75 - 5.75 * (drive / (drive + 2.0))


def blink_waveform(t_since_onset: np.ndarray) -> np.ndarray:
    """Eyelid closure over one blink: fast close, hold, slower reopen."""
    closure = np.zeros_like(t_since_onset, dtype=np.float64)

    closing = (t_since_onset >= 0) & (t_since_onset < BLINK_CLOSING_S)
    phase = t_since_onset[closing] / BLINK_CLOSING_S
    closure[closing] = 0.5 - 0.5 * np.cos(np.pi * phase)

    held_start = BLINK_CLOSING_S
    held_end = BLINK_CLOSING_S + BLINK_CLOSED_S
    closure[(t_since_onset >= held_start) & (t_since_onset < held_end)] = 1.0

    opening = (t_since_onset >= held_end) & (
        t_since_onset < held_end + BLINK_OPENING_S
    )
    phase = (t_since_onset[opening] - held_end) / BLINK_OPENING_S
    closure[opening] = 0.5 + 0.5 * np.cos(np.pi * phase)

    return closure


def simulate_eyes(
    duration_s: float = 10.0,
    *,
    fps: float = 30.0,
    seed: int = 0,
    luminance_cd_m2: float = 50.0,
    blink_rate_per_min: float = 17.0,
    mean_fixation_s: float = 0.28,
) -> EyeAnimation:
    """Simulate an eye animation curve.

    Args:
        duration_s: Clip length in seconds.
        fps: Sample rate of the returned curves.
        seed: Seed for the random draws; identical seeds give identical clips.
        luminance_cd_m2: Scene luminance driving the pupil light reflex.
        blink_rate_per_min: Spontaneous blink rate.
        mean_fixation_s: Mean inter-saccadic fixation duration.

    Raises:
        ValueError: on a non-positive duration or fps, or a negative rate.
    """
    if duration_s <= 0:
        raise ValueError(f"duration_s must be positive, got {duration_s}")
    if fps <= 0:
        raise ValueError(f"fps must be positive, got {fps}")
    if blink_rate_per_min < 0:
        raise ValueError(f"blink_rate_per_min must be >= 0, got {blink_rate_per_min}")
    if mean_fixation_s <= 0:
        raise ValueError(f"mean_fixation_s must be positive, got {mean_fixation_s}")

    rng = np.random.default_rng(seed)
    frame_count = max(2, round(duration_s * fps) + 1)
    times = np.arange(frame_count, dtype=np.float64) / fps

    saccades = _generate_saccades(duration_s, rng, mean_fixation_s)
    yaw, pitch = _sample_gaze(times, saccades)

    blinks = _generate_blinks(duration_s, rng, blink_rate_per_min)
    eyelid = _sample_eyelid(times, blinks)

    pupil = _sample_pupil(times, rng, luminance_cd_m2, eyelid)

    return EyeAnimation(
        fps=fps,
        duration_s=duration_s,
        times_s=times,
        gaze_yaw_deg=yaw,
        gaze_pitch_deg=pitch,
        eyelid_closure=eyelid,
        pupil_diameter_mm=pupil,
        saccades=saccades,
        blinks=blinks,
        luminance_cd_m2=luminance_cd_m2,
    )


# ── Internals ────────────────────────────────────────────────────────────────


def _generate_saccades(
    duration_s: float,
    rng: np.random.Generator,
    mean_fixation_s: float,
) -> list[SaccadeEvent]:
    """Walk the gaze through a fixate-saccade-fixate sequence."""
    events: list[SaccadeEvent] = []
    yaw = pitch = 0.0
    # Lognormal fixation durations, matched to the requested mean.
    sigma = 0.55
    mu = math.log(mean_fixation_s) - sigma**2 / 2.0

    clock = float(rng.lognormal(mu, sigma))
    while clock < duration_s:
        # Natural-viewing amplitudes are heavy-tailed and mostly small.
        amplitude = float(np.clip(rng.gamma(shape=2.0, scale=3.0), 0.5, 40.0))
        direction = rng.uniform(0.0, 2.0 * math.pi)

        target_yaw = float(
            np.clip(
                yaw + amplitude * math.cos(direction),
                -GAZE_LIMIT_YAW_DEG,
                GAZE_LIMIT_YAW_DEG,
            )
        )
        target_pitch = float(
            np.clip(
                pitch + amplitude * math.sin(direction) * 0.6,
                -GAZE_LIMIT_PITCH_DEG,
                GAZE_LIMIT_PITCH_DEG,
            )
        )

        # Clamping to the oculomotor range changes the realised amplitude.
        realised = math.hypot(target_yaw - yaw, target_pitch - pitch)
        if realised < 0.05:
            clock += float(rng.lognormal(mu, sigma))
            continue

        peak = saccade_peak_velocity(realised)
        length = saccade_duration(realised)
        if clock + length > duration_s:
            break

        events.append(
            SaccadeEvent(
                onset_s=clock,
                duration_s=length,
                amplitude_deg=realised,
                peak_velocity_deg_s=peak,
                from_yaw_deg=yaw,
                from_pitch_deg=pitch,
                to_yaw_deg=target_yaw,
                to_pitch_deg=target_pitch,
            )
        )
        yaw, pitch = target_yaw, target_pitch
        clock += length + float(rng.lognormal(mu, sigma))

    return events


def _min_jerk(tau: np.ndarray) -> np.ndarray:
    """Minimum-jerk interpolation profile on a normalised time base."""
    t = np.clip(tau, 0.0, 1.0)
    return 10.0 * t**3 - 15.0 * t**4 + 6.0 * t**5


def _sample_gaze(
    times: np.ndarray,
    saccades: list[SaccadeEvent],
) -> tuple[np.ndarray, np.ndarray]:
    yaw = np.zeros_like(times)
    pitch = np.zeros_like(times)
    if not saccades:
        return yaw, pitch

    for event in saccades:
        # Everything from this saccade's onset onwards takes its target value;
        # later saccades overwrite it, so the last one to fire wins.
        after = times >= event.onset_s
        yaw[after] = event.to_yaw_deg
        pitch[after] = event.to_pitch_deg

        during = after & (times < event.onset_s + event.duration_s)
        if not during.any():
            continue
        tau = (times[during] - event.onset_s) / event.duration_s
        profile = _min_jerk(tau)
        yaw[during] = (
            event.from_yaw_deg
            + (event.to_yaw_deg - event.from_yaw_deg) * profile
        )
        pitch[during] = (
            event.from_pitch_deg
            + (event.to_pitch_deg - event.from_pitch_deg) * profile
        )

    return yaw, pitch


def _generate_blinks(
    duration_s: float,
    rng: np.random.Generator,
    blink_rate_per_min: float,
) -> list[BlinkEvent]:
    if blink_rate_per_min <= 0:
        return []

    blink_length = BLINK_CLOSING_S + BLINK_CLOSED_S + BLINK_OPENING_S
    mean_interval = 60.0 / blink_rate_per_min

    # Onset-to-onset intervals are exponential (a Poisson process), floored by
    # the physiological refractory period. Flooring rather than adding keeps
    # the realised blink rate close to the requested one.
    floor = blink_length + BLINK_REFRACTORY_S

    events: list[BlinkEvent] = []
    clock = max(float(rng.exponential(mean_interval)), floor)
    while clock + blink_length <= duration_s:
        events.append(BlinkEvent(onset_s=clock, duration_s=blink_length))
        clock += max(float(rng.exponential(mean_interval)), floor)
    return events


def _sample_eyelid(times: np.ndarray, blinks: list[BlinkEvent]) -> np.ndarray:
    closure = np.zeros_like(times)
    for event in blinks:
        window = (times >= event.onset_s) & (
            times <= event.onset_s + event.duration_s
        )
        if window.any():
            closure[window] = np.maximum(
                closure[window], blink_waveform(times[window] - event.onset_s)
            )
    return np.clip(closure, 0.0, 1.0)


def _sample_pupil(
    times: np.ndarray,
    rng: np.random.Generator,
    luminance_cd_m2: float,
    eyelid: np.ndarray,
) -> np.ndarray:
    target = steady_state_pupil_diameter(luminance_cd_m2)
    dt = float(times[1] - times[0]) if times.shape[0] > 1 else 1.0

    # A blink briefly removes the light stimulus, so the pupil drifts open.
    dark_target = steady_state_pupil_diameter(luminance_cd_m2 * 0.05)
    drive = np.where(eyelid > 0.6, dark_target, target)

    # First-order lag with a transport delay of PUPIL_LATENCY_S.
    delay_frames = round(PUPIL_LATENCY_S / dt)
    if delay_frames > 0:
        drive = np.concatenate([np.full(delay_frames, target), drive])[: times.size]

    diameter = np.empty_like(times)
    state = target
    alpha = dt / (PUPIL_TIME_CONSTANT_S + dt)
    for i in range(times.size):
        state += alpha * (drive[i] - state)
        diameter[i] = state

    hippus = HIPPUS_AMPLITUDE_MM * np.sin(
        2.0 * np.pi * HIPPUS_FREQUENCY_HZ * times + rng.uniform(0.0, 2.0 * np.pi)
    )
    return np.clip(diameter + hippus, 1.5, 8.0)


def _round_all(values: np.ndarray, places: int) -> list[float]:
    return [round(float(v), places) for v in values]
