"""Video generation, instruction editing, and director assembly routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException

from ..models.video_schemas import (
    DirectorAssembleRequest,
    DirectorAssembleResponse,
    EditInstructionRequest,
    EditInstructionResponse,
    GenerateVideoRequest,
    GenerateVideoResponse,
)
from ..services.video_service import create_video_job

router = APIRouter(prefix="/ai/v1")


# ── POST /ai/v1/generate/video ──────────────────────────────────────────────


@router.post("/generate/video", response_model=GenerateVideoResponse, status_code=201)
async def generate_video(body: GenerateVideoRequest) -> GenerateVideoResponse:
    """Queue a new video generation job for the given shot."""
    if body.tier not in {"preview", "standard", "high"}:
        raise HTTPException(status_code=422, detail=f"Invalid tier: {body.tier}")

    job = create_video_job({"tier": body.tier, "shot_id": body.shot_id})

    return GenerateVideoResponse(
        job_id=job["id"],
        estimated_seconds=job["estimated_seconds"],
        preview_url=job["preview_url"],
    )


# ── POST /ai/v1/edit/instruction ────────────────────────────────────────────


@router.post("/edit/instruction", response_model=EditInstructionResponse, status_code=201)
async def edit_instruction(body: EditInstructionRequest) -> EditInstructionResponse:
    """Apply a natural-language editing instruction to an existing output."""
    job_id = str(uuid.uuid4())
    return EditInstructionResponse(job_id=job_id)


# ── POST /ai/v1/director/assemble ───────────────────────────────────────────


@router.post("/director/assemble", response_model=DirectorAssembleResponse, status_code=201)
async def director_assemble(body: DirectorAssembleRequest) -> DirectorAssembleResponse:
    """Assemble a rough cut from the supplied shots."""
    if body.pacing not in {"slow", "normal", "fast"}:
        raise HTTPException(status_code=422, detail=f"Invalid pacing: {body.pacing}")

    if not body.shot_ids:
        raise HTTPException(status_code=422, detail="shot_ids must not be empty")

    job_id = str(uuid.uuid4())
    rough_cut_url = (
        f"https://cdn.animaforge.ai/roughcut/{uuid.uuid4().hex[:12]}.mp4"
    )

    return DirectorAssembleResponse(job_id=job_id, rough_cut_url=rough_cut_url)
