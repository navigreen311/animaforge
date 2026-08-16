"""Pydantic models for AI audio generation and music composition endpoints."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

# ── Request Schemas ──────────────────────────────────────────────────────────


class GenerateAudioRequest(BaseModel):
    shot_id: str = Field(..., description="Identifier of the shot to attach audio to")
    dialogue: str = Field(..., description="Dialogue text to synthesise")
    voice_id: str = Field(..., description="Voice profile identifier")
    sfx_desc: str | None = Field(None, description="Optional SFX description to layer")
    beat_sync: bool = Field(False, description="Align audio to detected beat grid")


class MusicScoreRequest(BaseModel):
    project_id: str = Field(..., description="Project identifier")
    cut_url: str = Field(..., description="URL of the video cut to score against")
    mood: str = Field(..., description="Target mood descriptor (e.g. 'tense', 'uplifting')")
    stems: list[str] = Field(
        ..., description="Requested instrument stems (e.g. ['strings', 'drums'])"
    )


# ── Response Schemas ─────────────────────────────────────────────────────────


class GenerateAudioResponse(BaseModel):
    job_id: str
    estimated_seconds: float
    #: Engine marker; ``is_mock`` is true while synthesis is unimplemented.
    engine: dict[str, Any] | None = None


class CueSheet(BaseModel):
    title: str
    duration_ms: int
    stems: list[str]
    bpm: int
    key: str


class MusicScoreResponse(BaseModel):
    job_id: str
    cue_sheet: CueSheet


# ── Internal / Utility Schemas ───────────────────────────────────────────────


class Phoneme(BaseModel):
    phoneme: str
    start_ms: int
    end_ms: int
    #: Oculus viseme this phoneme maps to, for driving a mouth rig directly.
    viseme: str | None = None
    #: Word this phoneme belongs to, so a caller can group without re-parsing.
    word: str | None = None


class AudioJob(BaseModel):
    job_id: str
    status: str = "queued"
    shot_id: str | None = None
    project_id: str | None = None
    estimated_seconds: float = 0.0
    cue_sheet: CueSheet | None = None
    #: Engine marker. Carries ``is_mock`` so a caller never has to infer
    #: whether the job represents real work. See ``src.services.engines``.
    engine: dict[str, Any] | None = None


class LipSyncRequest(BaseModel):
    dialogue: str = Field(..., min_length=1, description="Line to be spoken")
    speaking_rate: float = Field(
        1.0, gt=0.0, le=4.0, description="Rate multiplier; 1.2 is 20% faster"
    )
    audio_path: str | None = Field(
        None,
        description=(
            "Optional recording to force-align against. Requires the gated "
            "audio engine; ignored with a note in the response otherwise."
        ),
    )


class LipSyncResponse(BaseModel):
    phonemes: list[Phoneme]
    #: ``forced-alignment`` when measured from audio, ``duration-model`` when
    #: modelled from text.
    source: str
    duration_ms: int
    engine: dict[str, Any]
