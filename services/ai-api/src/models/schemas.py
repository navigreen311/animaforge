from __future__ import annotations

from pydantic import BaseModel, Field


# ── Request Models ──────────────────────────────────────────────


class GenerateVideoRequest(BaseModel):
    shot_id: str
    tier: str
    scene_graph: dict
    style_ref: str | None = None
    char_refs: list[str] | None = None


class GenerateAudioRequest(BaseModel):
    shot_id: str
    dialogue: str
    voice_id: str
    sfx_desc: str | None = None
    beat_sync: bool = False


class GenerateAvatarRequest(BaseModel):
    character_id: str
    photos: list[str]
    style_mode: str = "realistic"


class StyleCloneRequest(BaseModel):
    source_url: str
    source_type: str


class ImgToCartoonRequest(BaseModel):
    image_url: str
    style: str
    strength: float = Field(ge=0.0, le=1.0)


class ScriptGenerateRequest(BaseModel):
    project_id: str
    scene_desc: str
    char_ids: list[str] | None = None


# ── Response Models ─────────────────────────────────────────────


class JobResponse(BaseModel):
    job_id: str
    estimated_seconds: int
    preview_url: str | None = None


class JobStatusResponse(BaseModel):
    status: str
    progress: float
    output_url: str | None = None
    quality_scores: dict | None = None
