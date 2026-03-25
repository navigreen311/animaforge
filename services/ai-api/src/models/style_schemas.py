"""Pydantic models for style clone and image-to-cartoon endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Style Clone
# ---------------------------------------------------------------------------

class StyleCloneRequest(BaseModel):
    source_url: str = Field(..., description="URL of the source media to analyse")
    source_type: str = Field(
        ...,
        description="Type of source media (e.g. 'film', 'animation', 'photo', 'illustration')",
    )


class StyleFingerprint(BaseModel):
    """Full fingerprint extracted from a visual source."""

    color_palette: List[str] = Field(
        ..., description="Dominant hex colours extracted from the source"
    )
    contrast_profile: str = Field(
        ..., description="High-level contrast descriptor (e.g. 'high', 'low', 'mixed')"
    )
    grain_noise: float = Field(
        ..., ge=0.0, le=1.0, description="Amount of film grain / noise (0-1)"
    )
    saturation_curve: str = Field(
        ..., description="Saturation tendency (e.g. 'warm-shift', 'cool-shift', 'neutral')"
    )
    lens_character: str = Field(
        ..., description="Lens rendering style (e.g. 'anamorphic', 'spherical', 'vintage')"
    )
    depth_of_field: str = Field(
        ..., description="DoF profile (e.g. 'shallow', 'deep', 'rack-focus')"
    )
    camera_motion: str = Field(
        ..., description="Dominant camera motion (e.g. 'handheld', 'steadicam', 'static')"
    )
    line_weight: str = Field(
        ..., description="Line rendering weight (e.g. 'thin', 'medium', 'bold')"
    )
    fill_style: str = Field(
        ..., description="Fill rendering approach (e.g. 'flat', 'gradient', 'textured')"
    )
    shading_approach: str = Field(
        ..., description="Shading method (e.g. 'cel', 'soft', 'cross-hatch')"
    )
    source_url: str
    source_type: str
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Overall confidence of the extraction"
    )
    created_at: datetime


class StyleCloneResponse(BaseModel):
    style_pack_id: str
    fingerprint: StyleFingerprint


# ---------------------------------------------------------------------------
# Image-to-Cartoon
# ---------------------------------------------------------------------------

class ImageToCartoonRequest(BaseModel):
    image_url: str = Field(..., description="URL of the input image")
    style: str = Field(
        ..., description="Target cartoon style (e.g. 'anime', 'comic', 'pixar', 'ghibli')"
    )
    strength: float = Field(
        ..., ge=0.0, le=1.0, description="Strength of the cartoon effect (0-1)"
    )


class PipelineStage(BaseModel):
    name: str
    status: str = "completed"
    duration_ms: float


class ImageToCartoonResponse(BaseModel):
    job_id: str
    output_url: str
    stages_completed: List[PipelineStage]
