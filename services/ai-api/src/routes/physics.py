"""Physics simulation routes -- cloth, hair, rigid body, soft body, wind."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services.physics_service import (
    apply_wind,
    get_material_presets,
    simulate_cloth,
    simulate_hair,
    simulate_rigid_body,
    simulate_soft_body,
    validate_physics_params,
)

router = APIRouter(prefix="/ai/v1")


# ── Request / Response schemas ───────────────────────────────────────────────


class ClothRequest(BaseModel):
    character_id: str
    garment_params: dict[str, Any] = Field(
        default_factory=dict,
        description="Garment mesh parameters: material, vertex_count, etc.",
    )
    motion_data: dict[str, Any] = Field(
        default_factory=lambda: {"duration_ms": 2000},
        description="Motion data with at least duration_ms.",
    )
    fps: int = Field(60, ge=1, le=240)


class ClothResponse(BaseModel):
    job_id: str
    character_id: str
    material: str
    frame_count: int
    collision_count: int
    stability_score: float
    frames: list[dict[str, Any]]


class HairRequest(BaseModel):
    character_id: str
    hair_params: dict[str, Any] = Field(
        default_factory=lambda: {"strand_count": 5000, "particles_per_strand": 12},
    )
    motion_data: dict[str, Any] = Field(
        default_factory=lambda: {"duration_ms": 2000},
    )
    wind_params: dict[str, Any] | None = None


class HairResponse(BaseModel):
    job_id: str
    character_id: str
    strand_count: int
    frame_count: int
    flicker_score: float
    frames: list[dict[str, Any]]


class RigidBodyRequest(BaseModel):
    objects: list[dict[str, Any]]
    forces: list[dict[str, Any]] = Field(default_factory=list)
    duration_ms: int = Field(2000, gt=0, le=600_000)


class RigidBodyResponse(BaseModel):
    frame_count: int
    objects_final_state: list[dict[str, Any]]
    frames: list[dict[str, Any]]


class SoftBodyRequest(BaseModel):
    mesh_url: str
    force_params: dict[str, Any] = Field(
        default_factory=lambda: {"direction": [0, -1, 0], "magnitude": 10.0},
    )
    material: dict[str, Any] = Field(
        default_factory=lambda: {"stiffness": 0.5, "damping": 0.99},
    )


class SoftBodyResponse(BaseModel):
    job_id: str
    deformed_mesh_url: str
    deformation_factor: float


class WindRequest(BaseModel):
    scene_id: str
    wind_direction: list[float] = Field(..., min_length=3, max_length=3)
    wind_strength: float = Field(..., ge=0, le=200)
    turbulence: float = Field(0.0, ge=0, le=1.0)


class WindResponse(BaseModel):
    scene_id: str
    wind_direction: list[float]
    wind_strength: float
    turbulence: float
    noise_amplitude: float
    force_vector: list[float]


class MaterialPresetsResponse(BaseModel):
    presets: dict[str, dict[str, float]]


# ── Routes ───────────────────────────────────────────────────────────────────


@router.post("/physics/cloth", response_model=ClothResponse)
async def cloth_simulation(body: ClothRequest) -> ClothResponse:
    """Run PBD cloth draping / dynamics simulation."""
    try:
        result = simulate_cloth(
            body.character_id,
            body.garment_params,
            body.motion_data,
            body.fps,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return ClothResponse(**result)


@router.post("/physics/hair", response_model=HairResponse)
async def hair_simulation(body: HairRequest) -> HairResponse:
    """Run strand-based hair physics simulation."""
    try:
        result = simulate_hair(
            body.character_id,
            body.hair_params,
            body.motion_data,
            body.wind_params,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return HairResponse(**result)


@router.post("/physics/rigid", response_model=RigidBodyResponse)
async def rigid_body_simulation(body: RigidBodyRequest) -> RigidBodyResponse:
    """Run rigid body collision simulation."""
    try:
        result = simulate_rigid_body(body.objects, body.forces, body.duration_ms)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return RigidBodyResponse(**result)


@router.post("/physics/soft", response_model=SoftBodyResponse)
async def soft_body_simulation(body: SoftBodyRequest) -> SoftBodyResponse:
    """Run deformable body simulation."""
    try:
        result = simulate_soft_body(body.mesh_url, body.force_params, body.material)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return SoftBodyResponse(**result)


@router.post("/physics/wind", response_model=WindResponse)
async def wind_application(body: WindRequest) -> WindResponse:
    """Apply wind force to a scene's cloth / hair simulations."""
    try:
        result = apply_wind(
            body.scene_id,
            body.wind_direction,
            body.wind_strength,
            body.turbulence,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return WindResponse(**result)


@router.get("/physics/materials", response_model=MaterialPresetsResponse)
async def material_presets() -> MaterialPresetsResponse:
    """Return available fabric material presets."""
    return MaterialPresetsResponse(presets=get_material_presets())
