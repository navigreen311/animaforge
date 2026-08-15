"""Routes for AI avatar reconstruction (X5 pipeline).

Besides the reconstruction endpoint this exposes a capability endpoint, so a
client can discover *before* submitting a job whether this host can run a real
reconstruction or will return procedural output, and one endpoint per
subsystem for the CPU-computable parts (skin scattering, FACS, eye motion).
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from ..services.avatar.engine import EngineUnavailable
from ..services.avatar.eyes import simulate_eyes
from ..services.avatar.facs import (
    ACTION_UNITS,
    ARKIT_BLENDSHAPES,
    EMOTION_PROTOTYPES,
    blendshapes_for_emotion,
    solve_blendshapes,
)
from ..services.avatar.sss import compute_skin_profile, profile_for_skin_tone
from ..services.avatar_service import create_avatar_job, pipeline_capability

router = APIRouter(prefix="/ai/v1")


# -- Request / Response Models ------------------------------------------------


class GenerateAvatarRequest(BaseModel):
    character_id: str
    photos: list[str]
    style_mode: str = "realistic"
    skin_tone: str | None = Field(
        default=None, description="Optional #RRGGBB swatch driving skin scattering"
    )
    eye_clip_seconds: float = Field(default=10.0, gt=0, le=120)


class GenerateAvatarResponse(BaseModel):
    """The reconstruction job record.

    ``is_mock`` is authoritative: when true, the artifacts are real files but
    the geometry is procedural and was not derived from the photographs.
    """

    model_config = ConfigDict(protected_namespaces=())

    job_id: str
    engine: str
    requested_engine: str
    is_mock: bool
    mock_notice: str | None
    model_url: str
    rig_url: str
    splat_url: str
    eye_animation_url: str
    steps_completed: list[dict[str, Any]]
    steps_summary: dict[str, int]
    artifacts: dict[str, dict[str, Any]]
    skin: dict[str, Any]
    body_params: dict[str, Any]
    eye_statistics: dict[str, Any]
    warnings: list[str]


class SkinProfileRequest(BaseModel):
    skin_tone: str | None = Field(default=None, description="#RRGGBB swatch")
    melanin_fraction: float | None = Field(default=None, ge=0.0, le=1.0)
    haemoglobin_fraction: float | None = Field(default=None, ge=0.0, le=1.0)
    oxygen_saturation: float = Field(default=0.85, ge=0.0, le=1.0)
    thickness_mm: float = Field(default=1.4, gt=0.0, le=10.0)


class FacsSolveRequest(BaseModel):
    action_units: dict[int, float] | None = Field(
        default=None, description="AU number to intensity in [0, 1]"
    )
    emotion: str | None = Field(default=None, description="Ekman prototype name")
    intensity: float = Field(default=1.0, ge=0.0, le=1.0)
    include_zeros: bool = False


class FacsSolveResponse(BaseModel):
    blendshapes: dict[str, float]
    active_count: int
    targets: list[str]


class EyeSimulationRequest(BaseModel):
    duration_s: float = Field(default=10.0, gt=0, le=300)
    fps: float = Field(default=30.0, gt=0, le=240)
    seed: int = 0
    luminance_cd_m2: float = Field(default=50.0, ge=0.0)
    blink_rate_per_min: float = Field(default=17.0, ge=0.0, le=120.0)


# -- Endpoints ----------------------------------------------------------------


@router.get("/avatar/capabilities")
async def avatar_capabilities() -> dict[str, Any]:
    """Report what the avatar pipeline can actually do on this host.

    Includes whether torch, gsplat and a CUDA device are present, whether
    model weights are provisioned, and which engine a job would run with.
    """
    return pipeline_capability()


@router.post("/generate/avatar", response_model=GenerateAvatarResponse, status_code=201)
async def generate_avatar(body: GenerateAvatarRequest) -> GenerateAvatarResponse:
    """Run the X5 7-step avatar reconstruction pipeline.

    Returns the job record with per-step status. A step is reported
    ``completed`` only if it ran; stages needing licensed weights or a GPU
    report ``skipped`` with the reason. Every URL points at a stored artifact.

    Responds 503 when ``AVATAR_ENGINE=real`` is set but the host cannot run it
    — the pipeline will not silently substitute procedural output.
    """
    try:
        result = create_avatar_job(
            character_id=body.character_id,
            photos=body.photos,
            style_mode=body.style_mode,
            skin_tone=body.skin_tone,
            eye_clip_seconds=body.eye_clip_seconds,
        )
    except EngineUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return GenerateAvatarResponse(**{
        key: result[key]
        for key in GenerateAvatarResponse.model_fields
    })


@router.post("/avatar/skin")
async def avatar_skin(body: SkinProfileRequest) -> dict[str, Any]:
    """Compute subsurface scattering parameters for skin (X5 subsystem 2)."""
    try:
        if body.skin_tone:
            profile = profile_for_skin_tone(body.skin_tone)
        else:
            profile = compute_skin_profile(
                melanin_fraction=(
                    body.melanin_fraction if body.melanin_fraction is not None else 0.12
                ),
                haemoglobin_fraction=(
                    body.haemoglobin_fraction
                    if body.haemoglobin_fraction is not None
                    else 0.008
                ),
                oxygen_saturation=body.oxygen_saturation,
                thickness_mm=body.thickness_mm,
            )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return profile.as_dict()


@router.get("/avatar/facs/action-units")
async def avatar_action_units() -> dict[str, Any]:
    """List the FACS action units and blendshape targets the rig supports."""
    return {
        "action_units": [
            {
                "au": unit.number,
                "name": unit.name,
                "muscle": unit.muscle,
                "bilateral": unit.bilateral,
                "targets": unit.targets,
            }
            for unit in sorted(ACTION_UNITS.values(), key=lambda u: u.number)
        ],
        "blendshape_targets": list(ARKIT_BLENDSHAPES),
        "emotions": sorted(EMOTION_PROTOTYPES),
    }


@router.post("/avatar/facs/solve", response_model=FacsSolveResponse)
async def avatar_facs_solve(body: FacsSolveRequest) -> FacsSolveResponse:
    """Solve FACS action units into blendshape weights (X5 subsystem 3)."""
    if (body.action_units is None) == (body.emotion is None):
        raise HTTPException(
            status_code=422,
            detail="Provide exactly one of 'action_units' or 'emotion'",
        )

    try:
        if body.emotion is not None:
            weights = blendshapes_for_emotion(body.emotion, body.intensity)
            if body.include_zeros:
                weights = {name: weights.get(name, 0.0) for name in ARKIT_BLENDSHAPES}
        else:
            scaled = {
                au: value * body.intensity
                for au, value in (body.action_units or {}).items()
            }
            weights = solve_blendshapes(scaled, include_zeros=body.include_zeros)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return FacsSolveResponse(
        blendshapes=weights,
        active_count=sum(1 for v in weights.values() if v > 0.0),
        targets=list(ARKIT_BLENDSHAPES),
    )


@router.post("/avatar/eyes/simulate")
async def avatar_eyes_simulate(body: EyeSimulationRequest) -> dict[str, Any]:
    """Simulate a saccade / blink / pupil animation curve (X5 subsystem 4)."""
    try:
        animation = simulate_eyes(
            duration_s=body.duration_s,
            fps=body.fps,
            seed=body.seed,
            luminance_cd_m2=body.luminance_cd_m2,
            blink_rate_per_min=body.blink_rate_per_min,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return animation.as_dict()
