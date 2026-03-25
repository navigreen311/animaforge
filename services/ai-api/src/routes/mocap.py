"""Motion capture input routes -- upload, retarget, blend, apply."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services.mocap_service import (
    SUPPORTED_FORMATS,
    blend_motions,
    motion_to_keyframes,
    parse_bvh,
    parse_fbx_motion,
    retarget_motion,
    validate_motion_data,
)

router = APIRouter(prefix="/ai/v1")

# ── In-memory motion store (demo) ───────────────────────────────────────────

_motion_store: dict[str, dict[str, Any]] = {}


# ── Request / Response schemas ───────────────────────────────────────────────


class UploadRequest(BaseModel):
    file_url: str
    format: str = Field(..., description="One of: bvh, fbx, c3d, trc")


class UploadResponse(BaseModel):
    motion_id: str
    format: str
    stats: dict[str, Any]


class RetargetRequest(BaseModel):
    motion_id: str
    character_id: str


class RetargetResponse(BaseModel):
    retargeted_motion_id: str
    compatibility: float


class BlendRequest(BaseModel):
    motion_a_id: str
    motion_b_id: str
    blend_factor: float = Field(0.5, ge=0.0, le=1.0)


class BlendResponse(BaseModel):
    blended_motion_id: str


class ApplyRequest(BaseModel):
    motion_id: str
    shot_id: str


class ApplyResponse(BaseModel):
    shot_id: str
    keyframe_count: int
    duration_ms: int


class FormatsResponse(BaseModel):
    formats: list[str]


# ── Routes ───────────────────────────────────────────────────────────────────


@router.post("/mocap/upload", response_model=UploadResponse)
async def upload_mocap(body: UploadRequest) -> UploadResponse:
    """Upload and parse a motion capture file."""
    fmt = body.format.lower()
    if fmt not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format {fmt!r}. Supported: {SUPPORTED_FORMATS}",
        )

    try:
        if fmt == "bvh":
            motion = parse_bvh(body.file_url)
        elif fmt == "fbx":
            motion = parse_fbx_motion(body.file_url)
        else:
            # c3d / trc -- not yet implemented
            raise HTTPException(
                status_code=501,
                detail=f"Format {fmt!r} parsing is not yet implemented",
            )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    validation = validate_motion_data(motion)
    if not validation["valid"]:
        raise HTTPException(status_code=422, detail=validation["errors"])

    motion_id = motion["motion_id"]
    _motion_store[motion_id] = motion

    return UploadResponse(
        motion_id=motion_id,
        format=fmt,
        stats={
            "joint_count": motion["joint_count"],
            "frame_count": motion["frame_count"],
            "fps": motion["fps"],
            "duration_ms": motion["duration_ms"],
        },
    )


@router.post("/mocap/retarget", response_model=RetargetResponse)
async def retarget_mocap(body: RetargetRequest) -> RetargetResponse:
    """Retarget a parsed motion to a character rig."""
    motion = _motion_store.get(body.motion_id)
    if motion is None:
        raise HTTPException(status_code=404, detail="motion_id not found")

    try:
        result = retarget_motion(motion, body.character_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    retargeted = result["retargeted_motion"]
    _motion_store[retargeted["motion_id"]] = retargeted

    return RetargetResponse(
        retargeted_motion_id=retargeted["motion_id"],
        compatibility=result["compatibility_score"],
    )


@router.post("/mocap/blend", response_model=BlendResponse)
async def blend_mocap(body: BlendRequest) -> BlendResponse:
    """Blend two motions together."""
    motion_a = _motion_store.get(body.motion_a_id)
    motion_b = _motion_store.get(body.motion_b_id)
    if motion_a is None or motion_b is None:
        raise HTTPException(status_code=404, detail="One or both motion_ids not found")

    blended = blend_motions(motion_a, motion_b, body.blend_factor)
    _motion_store[blended["motion_id"]] = blended

    return BlendResponse(blended_motion_id=blended["motion_id"])


@router.post("/mocap/apply", response_model=ApplyResponse)
async def apply_mocap(body: ApplyRequest) -> ApplyResponse:
    """Apply motion capture data to a shot's keyframes."""
    motion = _motion_store.get(body.motion_id)
    if motion is None:
        raise HTTPException(status_code=404, detail="motion_id not found")

    result = motion_to_keyframes(motion, body.shot_id)

    return ApplyResponse(
        shot_id=result["shot_id"],
        keyframe_count=result["keyframe_count"],
        duration_ms=result["duration_ms"],
    )


@router.get("/mocap/formats", response_model=FormatsResponse)
async def list_formats() -> FormatsResponse:
    """List supported motion capture formats."""
    return FormatsResponse(formats=SUPPORTED_FORMATS)
