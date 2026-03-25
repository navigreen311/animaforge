"""Pydantic models for video generation requests and responses."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


# ── Request Schemas ──────────────────────────────────────────────────────────


class GenerateVideoRequest(BaseModel):
    """Body for POST /ai/v1/generate/video."""

    shot_id: str = Field(..., description="Identifier of the shot to generate")
    tier: str = Field(
        "preview",
        description="Generation quality tier: preview | standard | high",
    )
    scene_graph: dict = Field(
        ..., description="Scene graph describing objects, layout, and actions"
    )
    style_ref: Optional[str] = Field(
        None, description="URL or ID of the style reference asset"
    )
    char_refs: Optional[List[str]] = Field(
        None, description="List of character reference asset URLs / IDs"
    )


class EditInstructionRequest(BaseModel):
    """Body for POST /ai/v1/edit/instruction."""

    shot_id: str = Field(..., description="Identifier of the shot to edit")
    output_id: str = Field(..., description="ID of the existing output to modify")
    instruction: str = Field(
        ..., description="Natural-language editing instruction"
    )
    mask_url: Optional[str] = Field(
        None, description="Optional mask image URL for region-specific edits"
    )


class DirectorAssembleRequest(BaseModel):
    """Body for POST /ai/v1/director/assemble."""

    project_id: str = Field(..., description="Project identifier")
    shot_ids: List[str] = Field(
        ..., description="Ordered list of shot IDs to assemble"
    )
    pacing: str = Field(
        "normal",
        description="Pacing profile: slow | normal | fast",
    )


# ── Response Schemas ─────────────────────────────────────────────────────────


class GenerateVideoResponse(BaseModel):
    """Response for POST /ai/v1/generate/video."""

    job_id: str
    estimated_seconds: float
    preview_url: str


class EditInstructionResponse(BaseModel):
    """Response for POST /ai/v1/edit/instruction."""

    job_id: str


class DirectorAssembleResponse(BaseModel):
    """Response for POST /ai/v1/director/assemble."""

    job_id: str
    rough_cut_url: str


# ── Internal / Domain Schemas ────────────────────────────────────────────────


class PipelineStage(BaseModel):
    """A single stage in the video generation pipeline."""

    name: str
    description: str
    estimated_seconds: float


class JobDict(BaseModel):
    """Canonical representation of a generation job."""

    id: str
    status: str = "queued"
    tier: str = "preview"
    estimated_seconds: float = 0.0
    credit_cost: float = 0.0
    preview_url: str = ""
    stages: List[PipelineStage] = []
