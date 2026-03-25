"""Routes for AI avatar reconstruction (X5 pipeline)."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from ..services.avatar_service import create_avatar_job

router = APIRouter(prefix="/ai/v1")


# -- Request / Response Models ------------------------------------------------


class GenerateAvatarRequest(BaseModel):
    character_id: str
    photos: list[str]
    style_mode: str = "realistic"


class GenerateAvatarResponse(BaseModel):
    job_id: str
    model_url: str
    rig_url: str


# -- Endpoints ----------------------------------------------------------------


@router.post("/generate/avatar", response_model=GenerateAvatarResponse, status_code=201)
async def generate_avatar(body: GenerateAvatarRequest) -> GenerateAvatarResponse:
    """Queue an avatar reconstruction job using the X5 7-step pipeline.

    Accepts a character identifier, a list of reference photo URLs, and an
    optional style mode.  Returns a job_id and URLs for the generated
    3-D model and rig.
    """
    result = create_avatar_job(
        character_id=body.character_id,
        photos=body.photos,
        style_mode=body.style_mode,
    )
    return GenerateAvatarResponse(
        job_id=result["job_id"],
        model_url=result["model_url"],
        rig_url=result["rig_url"],
    )
