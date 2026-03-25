"""Routes for AI script generation (G1) and QC validation."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from ..services.qc_service import validate_output
from ..services.script_service import generate_script

router = APIRouter(prefix="/ai/v1")


# -- Request / Response Models ------------------------------------------------


class ScriptGenerateRequest(BaseModel):
    project_id: str
    scene_desc: str
    char_ids: list[str] | None = None


class ShotBreakdownItem(BaseModel):
    shot_number: int
    description: str
    duration_ms: int
    camera: CameraInfo


class CameraInfo(BaseModel):
    angle: str
    movement: str


class TimingInfo(BaseModel):
    duration_ms: int
    pacing: str


class SceneGraphItem(BaseModel):
    subject: str
    camera: CameraInfo
    action: str
    emotion: str
    timing: TimingInfo
    dialogue: str | None = None


class ScriptGenerateResponse(BaseModel):
    script: str
    shot_breakdown: list[ShotBreakdownItem]
    scene_graphs: list[SceneGraphItem]


class QCValidateRequest(BaseModel):
    output_url: str
    checks: list[str]


class QCValidateResponse(BaseModel):
    report: dict
    passed: bool
    issues: list[str]


# -- Endpoints ----------------------------------------------------------------


@router.post("/script/generate", response_model=ScriptGenerateResponse, status_code=201)
async def script_generate(body: ScriptGenerateRequest) -> ScriptGenerateResponse:
    """Generate a script with shot breakdown and scene graphs from a scene description."""
    result = await generate_script(
        project_id=body.project_id,
        scene_desc=body.scene_desc,
        char_ids=body.char_ids,
    )
    return ScriptGenerateResponse(**result)


@router.post("/qc/validate", response_model=QCValidateResponse, status_code=200)
async def qc_validate(body: QCValidateRequest) -> QCValidateResponse:
    """Run quality-control checks against a rendered output."""
    result = validate_output(output_url=body.output_url, checks=body.checks)
    return QCValidateResponse(**result)
