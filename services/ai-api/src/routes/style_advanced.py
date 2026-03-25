"""Advanced style intelligence routes — X6b.

Provides endpoints for video/animation fingerprinting, comparison, blending,
style transfer, presets, evolution tracking, and correction suggestions.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..models.style_schemas import StyleFingerprint
from ..services.style_intelligence import (
    analyze_style_evolution,
    apply_style_transfer,
    blend_fingerprints,
    compare_fingerprints,
    create_style_preset,
    extract_animation_fingerprint,
    extract_video_fingerprint,
    list_style_presets,
    suggest_style_corrections,
)

router = APIRouter(prefix="/ai/v1")


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class VideoFingerprintRequest(BaseModel):
    video_url: str = Field(..., description="URL of the video to analyse")


class AnimationFingerprintRequest(BaseModel):
    video_url: str = Field(..., description="URL of the animation to analyse")


class CompareRequest(BaseModel):
    fingerprint_a: StyleFingerprint
    fingerprint_b: StyleFingerprint


class CompareResponse(BaseModel):
    similarity: float
    dimension_scores: Dict[str, float]


class BlendRequest(BaseModel):
    fingerprints: List[StyleFingerprint]
    weights: List[float]


class BlendResponse(BaseModel):
    blended_fingerprint: StyleFingerprint


class TransferRequest(BaseModel):
    content_url: str = Field(..., description="URL of the content to stylise")
    fingerprint: StyleFingerprint
    strength: float = Field(0.8, ge=0.0, le=1.0)
    preserve_content: float = Field(0.5, ge=0.0, le=1.0)


class PresetCreateRequest(BaseModel):
    name: str = Field(..., description="Human-readable preset name")
    fingerprint: StyleFingerprint
    variations: Optional[List[float]] = Field(
        None, description="Strength levels for preset variations"
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/style/fingerprint/video")
async def fingerprint_video(request: VideoFingerprintRequest) -> Dict[str, Any]:
    """Extract a style fingerprint from a video source."""
    fp = extract_video_fingerprint(request.video_url)
    return {"fingerprint": fp.model_dump(mode="json")}


@router.post("/style/fingerprint/animation")
async def fingerprint_animation(request: AnimationFingerprintRequest) -> Dict[str, Any]:
    """Extract an animation-specific fingerprint."""
    result = extract_animation_fingerprint(request.video_url)
    return {
        "fingerprint": result["fingerprint"].model_dump(mode="json"),
        "animation_meta": result["animation_meta"],
    }


@router.post("/style/compare", response_model=CompareResponse)
async def compare_styles(request: CompareRequest) -> CompareResponse:
    """Compare two style fingerprints across all dimensions."""
    result = compare_fingerprints(request.fingerprint_a, request.fingerprint_b)
    return CompareResponse(**result)


@router.post("/style/blend", response_model=BlendResponse)
async def blend_styles(request: BlendRequest) -> BlendResponse:
    """Blend multiple style fingerprints with weights."""
    blended = blend_fingerprints(request.fingerprints, request.weights)
    return BlendResponse(blended_fingerprint=blended)


@router.post("/style/transfer")
async def transfer_style(request: TransferRequest) -> Dict[str, Any]:
    """Apply a style fingerprint to content."""
    result = apply_style_transfer(
        content_url=request.content_url,
        fingerprint=request.fingerprint,
        strength=request.strength,
        preserve_content=request.preserve_content,
    )
    return result


@router.post("/style/preset")
async def create_preset(request: PresetCreateRequest) -> Dict[str, Any]:
    """Create a reusable style preset with variations."""
    preset = create_style_preset(
        name=request.name,
        fingerprint=request.fingerprint,
        variations=request.variations,
    )
    return preset


@router.get("/style/presets")
async def get_presets() -> List[Dict[str, Any]]:
    """List all available style presets."""
    return list_style_presets()


@router.post("/style/evolution/{project_id}")
async def evolution(project_id: str) -> Dict[str, Any]:
    """Analyse how style evolves across shots in a project."""
    return analyze_style_evolution(project_id)


@router.post("/style/corrections/{project_id}")
async def corrections(project_id: str) -> Dict[str, Any]:
    """Suggest corrections to maintain style consistency."""
    return suggest_style_corrections(project_id)
