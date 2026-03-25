"""Pydantic models for AI audio generation and music composition endpoints."""

from __future__ import annotations

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
    stems: list[str] = Field(..., description="Requested instrument stems (e.g. ['strings', 'drums'])")


# ── Response Schemas ─────────────────────────────────────────────────────────

class GenerateAudioResponse(BaseModel):
    job_id: str
    estimated_seconds: float


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


class AudioJob(BaseModel):
    job_id: str
    status: str = "queued"
    shot_id: str | None = None
    project_id: str | None = None
    estimated_seconds: float = 0.0
    cue_sheet: CueSheet | None = None
