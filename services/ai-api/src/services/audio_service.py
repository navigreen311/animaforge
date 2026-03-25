"""Service layer for AI audio generation and music composition."""

from __future__ import annotations

import uuid
from typing import Any

from ..models.audio_schemas import (
    AudioJob,
    CueSheet,
    GenerateAudioRequest,
    MusicScoreRequest,
    Phoneme,
)

# ── Constants ────────────────────────────────────────────────────────────────

_PROCESSING_RATE_FACTOR: float = 0.4  # seconds of processing per second of audio


# ── Public API ───────────────────────────────────────────────────────────────


def create_audio_job(params: GenerateAudioRequest) -> AudioJob:
    """Create an audio-generation job and return its metadata."""
    duration_ms = _estimate_dialogue_duration_ms(params.dialogue)
    estimated = estimate_audio_time(duration_ms)

    return AudioJob(
        job_id=_new_job_id(),
        status="queued",
        shot_id=params.shot_id,
        estimated_seconds=estimated,
    )


def create_music_job(params: MusicScoreRequest) -> AudioJob:
    """Create a music-composition job with a mock cue sheet."""
    cue_sheet = CueSheet(
        title=f"{params.mood.title()} Score",
        duration_ms=180_000,  # default 3-minute score
        stems=params.stems,
        bpm=120,
        key="C minor",
    )
    estimated = estimate_audio_time(cue_sheet.duration_ms)

    return AudioJob(
        job_id=_new_job_id(),
        status="queued",
        project_id=params.project_id,
        estimated_seconds=estimated,
        cue_sheet=cue_sheet,
    )


def generate_lip_sync_data(dialogue: str) -> list[dict[str, Any]]:
    """Return a mock phoneme timeline for the given dialogue.

    Each word is decomposed into a simplified phoneme representation
    with start / end timestamps in milliseconds.
    """
    phonemes: list[Phoneme] = []
    cursor_ms = 0
    phoneme_duration_ms = 80  # average phoneme length

    for word in dialogue.split():
        for char in word.upper():
            if char.isalpha():
                phonemes.append(
                    Phoneme(
                        phoneme=char,
                        start_ms=cursor_ms,
                        end_ms=cursor_ms + phoneme_duration_ms,
                    )
                )
                cursor_ms += phoneme_duration_ms
        # short pause between words
        cursor_ms += 40

    return [p.model_dump() for p in phonemes]


def estimate_audio_time(duration_ms: int) -> float:
    """Estimate processing time in seconds for the given audio duration."""
    return round((duration_ms / 1000) * _PROCESSING_RATE_FACTOR, 2)


# ── Helpers ──────────────────────────────────────────────────────────────────


def _new_job_id() -> str:
    return f"audio-{uuid.uuid4().hex[:12]}"


def _estimate_dialogue_duration_ms(dialogue: str) -> int:
    """Rough heuristic: ~150 words per minute -> 400 ms per word."""
    word_count = len(dialogue.split())
    return max(word_count * 400, 1000)
