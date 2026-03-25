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
from ..services.job_manager import create_job
from ..services.video_service import (
    create_video_job,
    estimate_generation_time,
)

router = APIRouter(prefix="/ai/v1")


@router.post("/generate/video", response_model=GenerateVideoResponse, status_code=201)
async def generate_video(body: GenerateVideoRequest) -> GenerateVideoResponse:
    """Queue a new video generation job for the given shot."""
    if body.tier not in {"preview", "standard", "high"}:
        raise HTTPException(status_code=422, detail=f"Invalid tier: {body.tier}")

    job = create_video_job({"tier": body.tier, "shot_id": body.shot_id})

    # Persist to Redis so the job can be polled via GET /jobs/{job_id}
    managed = create_job(
        job_type="generate_video",
        payload={"tier": body.tier, "shot_id": body.shot_id},
    )

    return GenerateVideoResponse(
        job_id=managed["job_id"],
        estimated_seconds=managed["estimated_seconds"],
        preview_url=job["preview_url"],
    )


@router.post("/edit/instruction", response_model=EditInstructionResponse, status_code=201)
async def edit_instruction(body: EditInstructionRequest) -> EditInstructionResponse:
    """Apply a natural-language editing instruction to an existing output."""
    # Persist to Redis so the job can be polled
    managed = create_job(
        job_type="edit_instruction",
        payload={
            "shot_id": body.shot_id,
            "output_id": body.output_id,
            "instruction": body.instruction,
        },
    )
    return EditInstructionResponse(job_id=managed["job_id"])


@router.post("/director/assemble", response_model=DirectorAssembleResponse, status_code=201)
async def director_assemble(body: DirectorAssembleRequest) -> DirectorAssembleResponse:
    """Assemble a rough cut from the supplied shots."""
    if body.pacing not in {"slow", "normal", "fast"}:
        raise HTTPException(status_code=422, detail=f"Invalid pacing: {body.pacing}")

    if not body.shot_ids:
        raise HTTPException(status_code=422, detail="shot_ids must not be empty")

    rough_cut_url = (
        f"https://cdn.animaforge.ai/roughcut/{uuid.uuid4().hex[:12]}.mp4"
    )

    # Persist to Redis so the job can be polled
    managed = create_job(
        job_type="director_assemble",
        payload={"shot_ids": body.shot_ids, "pacing": body.pacing},
    )

    return DirectorAssembleResponse(job_id=managed["job_id"], rough_cut_url=rough_cut_url)
