"""Cartoon Pro control routes — E7.

Endpoints for fine-grained cartoon styling: line art, fill, shading,
motion principles, model sheets, batch styling, presets, and proportions.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..services.cartoon_pro_service import (
    adjust_proportions,
    apply_fill_controls,
    apply_line_controls,
    apply_motion_principles,
    apply_shading_controls,
    batch_apply_style,
    create_style_sheet,
    get_cartoon_presets,
)

router = APIRouter(prefix="/ai/v1")


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class LineControlsRequest(BaseModel):
    image_url: str = Field(..., description="URL of the image to process")
    line_weight: float = Field(1.0, ge=0.1, le=5.0)
    taper: float = Field(0.5, ge=0.0, le=1.0)
    variation: float = Field(0.3, ge=0.0, le=1.0)
    color: str = Field("#000000", description="Line color as hex")


class FillControlsRequest(BaseModel):
    image_url: str = Field(..., description="URL of the image to process")
    fill_style: str = Field("flat", description="flat|gradient|cel|painterly")
    palette: Optional[List[str]] = Field(None, description="Color palette as hex list")
    shading: float = Field(0.5, ge=0.0, le=1.0)


class ShadingControlsRequest(BaseModel):
    image_url: str = Field(..., description="URL of the image to process")
    shading_type: str = Field("soft", description="hard|soft|rim|none|crosshatch")
    intensity: float = Field(0.5, ge=0.0, le=1.0)
    light_dir: str = Field("top-left", description="Light direction")


class MotionPrinciplesRequest(BaseModel):
    animation_data: str = Field(..., description="URL or ID of animation data")
    squash_stretch: float = Field(0.5, ge=0.0, le=1.0)
    anticipation: float = Field(0.5, ge=0.0, le=1.0)
    follow_through: float = Field(0.5, ge=0.0, le=1.0)
    ease: float = Field(0.5, ge=0.0, le=1.0)
    smear: float = Field(0.0, ge=0.0, le=1.0)


class ModelSheetRequest(BaseModel):
    character_id: str = Field(..., description="Character identifier")
    views: Optional[List[str]] = Field(
        None, description="Views to generate (default: front, side, back, 3/4, expressions)"
    )


class BatchStyleRequest(BaseModel):
    image_urls: List[str] = Field(..., description="List of image URLs to style")
    style_config: Dict[str, Any] = Field(..., description="Style configuration dict")


class ProportionsRequest(BaseModel):
    character_id: str = Field(..., description="Character identifier")
    head_ratio: float = Field(1.0, ge=0.5, le=4.0)
    eye_size: float = Field(1.0, ge=0.5, le=3.0)
    limb_length: float = Field(1.0, ge=0.5, le=2.0)
    body_type: str = Field("standard", description="Body type category")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/cartoon/lines")
async def line_art_controls(request: LineControlsRequest) -> Dict[str, Any]:
    """Fine-tune line art on a cartoon image."""
    return apply_line_controls(
        image_url=request.image_url,
        line_weight=request.line_weight,
        taper=request.taper,
        variation=request.variation,
        color=request.color,
    )


@router.post("/cartoon/fill")
async def fill_style_controls(request: FillControlsRequest) -> Dict[str, Any]:
    """Control flat fill style: flat, gradient, cel, painterly."""
    return apply_fill_controls(
        image_url=request.image_url,
        fill_style=request.fill_style,
        palette=request.palette,
        shading=request.shading,
    )


@router.post("/cartoon/shading")
async def shading_controls(request: ShadingControlsRequest) -> Dict[str, Any]:
    """Control shading: hard, soft, rim, none, crosshatch."""
    return apply_shading_controls(
        image_url=request.image_url,
        shading_type=request.shading_type,
        intensity=request.intensity,
        light_dir=request.light_dir,
    )


@router.post("/cartoon/motion-principles")
async def motion_principles(request: MotionPrinciplesRequest) -> Dict[str, Any]:
    """Apply classic animation principles to animation data."""
    return apply_motion_principles(
        animation_data=request.animation_data,
        squash_stretch=request.squash_stretch,
        anticipation=request.anticipation,
        follow_through=request.follow_through,
        ease=request.ease,
        smear=request.smear,
    )


@router.post("/cartoon/model-sheet")
async def model_sheet(request: ModelSheetRequest) -> Dict[str, Any]:
    """Generate a character model sheet with multiple views."""
    return create_style_sheet(
        character_id=request.character_id,
        views=request.views,
    )


@router.post("/cartoon/batch-style")
async def batch_style(request: BatchStyleRequest) -> Dict[str, Any]:
    """Apply consistent cartoon style across a batch of images."""
    return batch_apply_style(
        image_urls=request.image_urls,
        style_config=request.style_config,
    )


@router.get("/cartoon/presets")
async def presets() -> List[Dict[str, Any]]:
    """List all named cartoon style presets."""
    return get_cartoon_presets()


@router.post("/cartoon/proportions")
async def proportions(request: ProportionsRequest) -> Dict[str, Any]:
    """Adjust character proportions for cartoon style exaggeration."""
    return adjust_proportions(
        character_id=request.character_id,
        head_ratio=request.head_ratio,
        eye_size=request.eye_size,
        limb_length=request.limb_length,
        body_type=request.body_type,
    )
