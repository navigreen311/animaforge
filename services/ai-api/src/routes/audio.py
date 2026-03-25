"""AI audio generation and music composition routes."""

from __future__ import annotations

from fastapi import APIRouter

from ..models.audio_schemas import (
    GenerateAudioRequest,
    GenerateAudioResponse,
    MusicScoreRequest,
    MusicScoreResponse,
)
from ..services.audio_service import create_audio_job, create_music_job

router = APIRouter(prefix="/ai/v1")


@router.post("/generate/audio", response_model=GenerateAudioResponse)
async def generate_audio(body: GenerateAudioRequest) -> GenerateAudioResponse:
    """Kick off an AI audio-generation job for a given shot."""
    job = create_audio_job(body)
    return GenerateAudioResponse(
        job_id=job.job_id,
        estimated_seconds=job.estimated_seconds,
    )


@router.post("/music/score", response_model=MusicScoreResponse)
async def music_score(body: MusicScoreRequest) -> MusicScoreResponse:
    """Kick off an AI music-composition job for a project cut."""
    job = create_music_job(body)
    assert job.cue_sheet is not None  # guaranteed by create_music_job
    return MusicScoreResponse(
        job_id=job.job_id,
        cue_sheet=job.cue_sheet,
    )
