"""Scene graph spatial reasoning routes -- layout, occlusion, camera, lighting."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services.engines import real_marker
from ..services.scene_decomposition import (
    decompose_prompt,
    decompose_sequence,
    to_scene_graph,
)
from ..services.scene_graph_engine import (
    compute_camera_frustum,
    compute_lighting,
    compute_spatial_layout,
    detect_occlusions,
    generate_depth_map,
    interpolate_between_shots,
    suggest_camera_placement,
    validate_composition,
)

router = APIRouter(prefix="/ai/v1")


# -- Request / Response schemas -----------------------------------------------


class SceneGraphRequest(BaseModel):
    scene_graph: dict[str, Any] = Field(..., description="Scene graph JSON with 'elements' list")


class LayoutResponse(BaseModel):
    elements: list[dict[str, Any]]


class OcclusionResponse(BaseModel):
    occlusions: list[dict[str, Any]]


class CameraFrustumRequest(BaseModel):
    camera_spec: dict[str, Any] = Field(
        ...,
        description="Camera specification: focal_length, position, rotation, near, far, aspect",
    )


class CameraFrustumResponse(BaseModel):
    near: float
    far: float
    fov: float
    aspect: float
    frustum_corners: list[dict[str, float]]


class ValidateRequest(BaseModel):
    layout: dict[str, Any] = Field(..., description="Spatial layout from /layout endpoint")
    camera_frustum: dict[str, Any] = Field(..., description="Camera frustum from /camera-frustum endpoint")


class ValidateResponse(BaseModel):
    score: float
    violations: list[str]
    suggestions: list[str]


class DepthMapRequest(BaseModel):
    layout: dict[str, Any] = Field(..., description="Spatial layout")
    camera: dict[str, Any] = Field(..., description="Camera specification")


class DepthMapResponse(BaseModel):
    elements: list[dict[str, Any]]


class InterpolateRequest(BaseModel):
    scene_graph_a: dict[str, Any] = Field(..., description="First scene graph")
    scene_graph_b: dict[str, Any] = Field(..., description="Second scene graph")
    t: float = Field(..., ge=0.0, le=1.0, description="Interpolation parameter [0,1]")


class InterpolateResponse(BaseModel):
    elements: list[dict[str, Any]]
    t: float


class SuggestCameraRequest(BaseModel):
    scene_graph: dict[str, Any] = Field(..., description="Scene graph JSON")
    style: str = Field("cinematic", description="Style preset: cinematic, documentary, anime")


class SuggestCameraResponse(BaseModel):
    suggestions: list[dict[str, Any]]


class LightingResponse(BaseModel):
    key_light: dict[str, Any]
    fill_light: dict[str, Any]
    back_light: dict[str, Any]
    ambient: dict[str, Any]


class DecomposeRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Natural-language shot description")
    previous_shot_id: str | None = Field(
        None, description="Shot this one continues from, for continuity dependency"
    )
    shot_id: str | None = Field(None, description="Override the derived shot id")


class DecomposeResponse(BaseModel):
    decomposition: dict[str, Any]
    scene_graph: dict[str, Any]
    engine: dict[str, Any]


class DecomposeSequenceRequest(BaseModel):
    prompts: list[str] = Field(..., min_length=1, description="Ordered shot prompts")


class DecomposeSequenceResponse(BaseModel):
    shots: list[dict[str, Any]]
    shot_count: int
    total_duration_s: float
    mean_coverage: float
    engine: dict[str, Any]


# -- Endpoints ----------------------------------------------------------------


@router.post("/scene-graph/decompose", response_model=DecomposeResponse)
async def decompose_endpoint(req: DecomposeRequest) -> DecomposeResponse:
    """Turn a prompt into the ten structured E3 fields, plus a scene graph.

    This is the layer that was missing: every other endpoint here consumes a
    scene graph, and nothing produced one. Deterministic -- no model call --
    and each field records whether it was matched from the prompt, derived by
    rule, or defaulted.
    """
    try:
        decomposition = decompose_prompt(
            req.prompt,
            previous_shot_id=req.previous_shot_id,
            shot_id=req.shot_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return DecomposeResponse(
        decomposition=decomposition,
        scene_graph=to_scene_graph(decomposition),
        engine=real_marker("scene_graph", detail="Deterministic rule-based decomposition."),
    )


@router.post("/scene-graph/decompose-sequence", response_model=DecomposeSequenceResponse)
async def decompose_sequence_endpoint(
    req: DecomposeSequenceRequest,
) -> DecomposeSequenceResponse:
    """Decompose an ordered list of prompts, chaining continuity between shots."""
    try:
        result = decompose_sequence(req.prompts)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return DecomposeSequenceResponse(
        **result,
        engine=real_marker("scene_graph", detail="Deterministic rule-based decomposition."),
    )


@router.post("/scene-graph/layout", response_model=LayoutResponse)
async def layout_endpoint(req: SceneGraphRequest) -> LayoutResponse:
    try:
        result = compute_spatial_layout(req.scene_graph)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return LayoutResponse(**result)


@router.post("/scene-graph/occlusions", response_model=OcclusionResponse)
async def occlusions_endpoint(req: SceneGraphRequest) -> OcclusionResponse:
    try:
        layout = compute_spatial_layout(req.scene_graph)
        result = detect_occlusions(layout)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return OcclusionResponse(**result)


@router.post("/scene-graph/camera-frustum", response_model=CameraFrustumResponse)
async def camera_frustum_endpoint(req: CameraFrustumRequest) -> CameraFrustumResponse:
    try:
        result = compute_camera_frustum(req.camera_spec)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return CameraFrustumResponse(**result)


@router.post("/scene-graph/validate", response_model=ValidateResponse)
async def validate_endpoint(req: ValidateRequest) -> ValidateResponse:
    try:
        result = validate_composition(req.layout, req.camera_frustum)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return ValidateResponse(**result)


@router.post("/scene-graph/depth-map", response_model=DepthMapResponse)
async def depth_map_endpoint(req: DepthMapRequest) -> DepthMapResponse:
    try:
        result = generate_depth_map(req.layout, req.camera)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return DepthMapResponse(**result)


@router.post("/scene-graph/interpolate", response_model=InterpolateResponse)
async def interpolate_endpoint(req: InterpolateRequest) -> InterpolateResponse:
    try:
        result = interpolate_between_shots(req.scene_graph_a, req.scene_graph_b, req.t)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return InterpolateResponse(**result)


@router.post("/scene-graph/suggest-camera", response_model=SuggestCameraResponse)
async def suggest_camera_endpoint(req: SuggestCameraRequest) -> SuggestCameraResponse:
    try:
        result = suggest_camera_placement(req.scene_graph, req.style)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return SuggestCameraResponse(**result)


@router.post("/scene-graph/lighting", response_model=LightingResponse)
async def lighting_endpoint(req: SceneGraphRequest) -> LightingResponse:
    try:
        result = compute_lighting(req.scene_graph)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return LightingResponse(**result)
