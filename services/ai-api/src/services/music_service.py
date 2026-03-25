"""Service layer for AI music composition with AudioCraft-style patterns.

Provides scene-aware score generation, stem-based mixing, beat detection,
sound effects generation, and video-to-music synchronisation.
"""

from __future__ import annotations

import hashlib
import math
import uuid
from typing import Any

# ── Constants ────────────────────────────────────────────────────────────────

_BASE_URL = "https://cdn.animaforge.ai/audio"
_DEFAULT_TEMPO = 120
_DEFAULT_KEY = "C minor"
_DEFAULT_TIME_SIG = "4/4"
_VALID_STEM_TYPES = frozenset(
    {"melody", "harmony", "bass", "drums", "strings", "synth", "ambient"}
)
_MOOD_KEY_MAP: dict[str, str] = {
    "happy": "C major",
    "sad": "A minor",
    "tense": "D minor",
    "uplifting": "G major",
    "dark": "E minor",
    "romantic": "F major",
    "epic": "B♭ minor",
    "calm": "E♭ major",
}
_MOOD_TEMPO_MAP: dict[str, int] = {
    "happy": 128,
    "sad": 72,
    "tense": 140,
    "uplifting": 120,
    "dark": 90,
    "romantic": 80,
    "epic": 150,
    "calm": 65,
}


# ── Public API ───────────────────────────────────────────────────────────────


def generate_score(
    project_id: str,
    scene_analysis: dict[str, Any],
    mood: str,
    duration_ms: int,
    genre: str | None = None,
) -> dict[str, Any]:
    """Simulate full score generation from scene analysis and mood.

    Returns a job_id and a cue sheet with sections, transitions, tempo,
    key, and time signature.
    """
    if duration_ms <= 0:
        raise ValueError("duration_ms must be positive")

    tempo = _MOOD_TEMPO_MAP.get(mood, _DEFAULT_TEMPO)
    key = _MOOD_KEY_MAP.get(mood, _DEFAULT_KEY)
    section_count = max(1, duration_ms // 30_000)  # ~30s per section

    sections: list[dict[str, Any]] = []
    transitions: list[dict[str, Any]] = []
    section_duration = duration_ms // section_count

    for i in range(section_count):
        start_ms = i * section_duration
        end_ms = start_ms + section_duration
        intensity = scene_analysis.get("intensity_curve", [0.5] * section_count)
        section_intensity = (
            intensity[i] if i < len(intensity) else intensity[-1] if intensity else 0.5
        )
        sections.append(
            {
                "index": i,
                "start_ms": start_ms,
                "end_ms": end_ms,
                "intensity": round(section_intensity, 2),
                "genre": genre or "cinematic",
            }
        )
        if i > 0:
            transitions.append(
                {
                    "from_section": i - 1,
                    "to_section": i,
                    "type": "crossfade",
                    "duration_ms": min(2000, section_duration // 4),
                }
            )

    return {
        "job_id": _new_job_id(),
        "cue_sheet": {
            "sections": sections,
            "transitions": transitions,
            "tempo": tempo,
            "key": key,
            "time_signature": _DEFAULT_TIME_SIG,
        },
    }


def analyze_scene_for_music(
    scene_graphs: list[dict[str, Any]],
) -> dict[str, Any]:
    """Extract emotional arc, pacing, and intensity curve from scene graphs.

    Each scene graph is expected to contain at least ``emotion`` (str) and
    ``duration_ms`` (int) fields; missing values are gracefully defaulted.
    """
    if not scene_graphs:
        raise ValueError("scene_graphs must not be empty")

    emotional_arc: list[dict[str, Any]] = []
    intensity_curve: list[float] = []
    total_duration = 0

    for idx, sg in enumerate(scene_graphs):
        emotion = sg.get("emotion", "neutral")
        duration = sg.get("duration_ms", 5000)
        energy = sg.get("energy", 0.5)
        total_duration += duration

        emotional_arc.append(
            {"index": idx, "emotion": emotion, "duration_ms": duration}
        )
        intensity_curve.append(round(float(energy), 2))

    avg_duration = total_duration / len(scene_graphs)
    pacing = "fast" if avg_duration < 3000 else "slow" if avg_duration > 8000 else "medium"

    avg_intensity = sum(intensity_curve) / len(intensity_curve)
    suggested_tempo = int(80 + avg_intensity * 80)  # 80-160 bpm range
    suggested_key = "C major" if avg_intensity > 0.5 else "A minor"

    return {
        "emotional_arc": emotional_arc,
        "pacing_profile": pacing,
        "intensity_curve": intensity_curve,
        "suggested_tempo": suggested_tempo,
        "suggested_key": suggested_key,
    }


def generate_stems(
    job_id: str,
    stem_types: list[str],
) -> dict[str, Any]:
    """Generate individual instrument stems for a music composition job.

    *stem_types* must be a subset of the valid stem types: melody, harmony,
    bass, drums, strings, synth, ambient.
    """
    invalid = set(stem_types) - _VALID_STEM_TYPES
    if invalid:
        raise ValueError(f"Invalid stem types: {sorted(invalid)}")
    if not stem_types:
        raise ValueError("stem_types must not be empty")

    stems: list[dict[str, Any]] = []
    for st in stem_types:
        stem_id = hashlib.md5(f"{job_id}-{st}".encode()).hexdigest()[:10]
        stems.append(
            {
                "type": st,
                "url": f"{_BASE_URL}/stems/{job_id}/{stem_id}_{st}.wav",
                "duration_ms": 180_000,  # default 3-minute stem
            }
        )

    return {"stems": stems}


def mix_stems(
    stems: list[dict[str, Any]],
    mix_params: dict[str, Any],
) -> dict[str, Any]:
    """Combine stems with volume, pan, and effects per stem.

    *stems* — list of ``{type, url, duration_ms}`` dicts.
    *mix_params* — ``{master_volume, per_stem: [{type, volume, pan, effects[]}]}``.
    """
    if not stems:
        raise ValueError("stems must not be empty")

    max_duration = max(s.get("duration_ms", 0) for s in stems)
    mix_id = uuid.uuid4().hex[:12]

    return {
        "mixed_url": f"{_BASE_URL}/mixes/{mix_id}/master.wav",
        "duration_ms": max_duration,
    }


def generate_sound_effects(
    scene_desc: str,
    timestamps: list[int],
) -> dict[str, Any]:
    """Generate SFX for specific timestamps based on a scene description.

    Returns a list of sound effects each tagged with timestamp, type, url,
    and duration.
    """
    if not timestamps:
        raise ValueError("timestamps must not be empty")

    sfx_types = _infer_sfx_types(scene_desc)
    sfx: list[dict[str, Any]] = []

    for i, ts in enumerate(timestamps):
        sfx_type = sfx_types[i % len(sfx_types)]
        sfx_id = uuid.uuid4().hex[:10]
        sfx.append(
            {
                "timestamp_ms": ts,
                "type": sfx_type,
                "url": f"{_BASE_URL}/sfx/{sfx_id}_{sfx_type}.wav",
                "duration_ms": 1500,
            }
        )

    return {"sfx": sfx}


def adjust_timing(
    music_url: str,
    cut_points: list[int],
) -> dict[str, Any]:
    """Re-time music to align with video edit cut points.

    Returns the URL of the adjusted audio file.
    """
    if not cut_points:
        raise ValueError("cut_points must not be empty")

    adjust_id = uuid.uuid4().hex[:12]
    return {
        "adjusted_url": f"{_BASE_URL}/adjusted/{adjust_id}/retimed.wav",
    }


def detect_beat_grid(audio_url: str) -> dict[str, Any]:
    """Analyse audio and return a simulated beat grid.

    Returns BPM, per-beat timestamps, downbeat positions, and time
    signature.
    """
    if not audio_url:
        raise ValueError("audio_url must not be empty")

    # Simulate a 3-minute track at 120 BPM
    bpm = 120
    beat_interval_ms = 60_000 / bpm  # 500 ms
    total_ms = 180_000
    beats_ms = [round(i * beat_interval_ms) for i in range(int(total_ms / beat_interval_ms))]
    downbeats_ms = beats_ms[::4]  # every 4th beat

    return {
        "bpm": bpm,
        "beats_ms": beats_ms,
        "downbeats_ms": downbeats_ms,
        "time_signature": "4/4",
    }


def sync_to_beats(
    video_url: str,
    audio_url: str,
) -> dict[str, Any]:
    """Align video cuts to detected music beats.

    Returns the URL of the synchronised video and a list of sync points.
    """
    if not video_url or not audio_url:
        raise ValueError("video_url and audio_url must not be empty")

    beat_grid = detect_beat_grid(audio_url)
    sync_id = uuid.uuid4().hex[:12]

    # Pick every 4th downbeat as a sync point (simulated)
    sync_points = [
        {"beat_ms": db, "cut_index": i}
        for i, db in enumerate(beat_grid["downbeats_ms"][:16])
    ]

    return {
        "synced_video_url": f"{_BASE_URL}/synced/{sync_id}/output.mp4",
        "sync_points": sync_points,
        "bpm": beat_grid["bpm"],
    }


# ── Helpers ──────────────────────────────────────────────────────────────────


def _new_job_id() -> str:
    return f"music-{uuid.uuid4().hex[:12]}"


def _infer_sfx_types(scene_desc: str) -> list[str]:
    """Simple keyword-based SFX type inference from a scene description."""
    desc_lower = scene_desc.lower()
    types: list[str] = []

    keyword_map = {
        "explosion": "boom",
        "rain": "rain",
        "thunder": "thunder",
        "footstep": "footstep",
        "door": "door_creak",
        "gun": "gunshot",
        "car": "engine",
        "wind": "wind",
        "water": "splash",
        "fire": "fire_crackle",
    }
    for keyword, sfx_type in keyword_map.items():
        if keyword in desc_lower:
            types.append(sfx_type)

    return types or ["ambient_whoosh"]
