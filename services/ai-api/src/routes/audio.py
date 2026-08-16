"""AI audio generation and music composition routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..models.audio_schemas import (
    GenerateAudioRequest,
    GenerateAudioResponse,
    LipSyncRequest,
    LipSyncResponse,
    MusicScoreRequest,
    MusicScoreResponse,
)
from ..services.audio_service import (
    create_audio_job,
    create_music_job,
    generate_lip_sync_data,
)

router = APIRouter(prefix="/ai/v1")


@router.post("/generate/audio", response_model=GenerateAudioResponse)
async def generate_audio(body: GenerateAudioRequest) -> GenerateAudioResponse:
    """Queue a speech-synthesis job.

    Speech synthesis is **not implemented**: no TTS adapter exists in this
    tree. The job record carries an explicit mock marker and no audio URL.
    Lip-sync timing for the same dialogue is real -- see
    ``POST /ai/v1/audio/lip-sync``.
    """
    job = create_audio_job(body)
    return GenerateAudioResponse(
        job_id=job.job_id,
        estimated_seconds=job.estimated_seconds,
        engine=job.engine,
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


@router.post("/audio/lip-sync", response_model=LipSyncResponse)
async def lip_sync_timing(body: LipSyncRequest) -> LipSyncResponse:
    """Produce a phoneme and viseme timeline for a line of dialogue.

    Real, and runs on CPU with no weights: rule-based grapheme-to-phoneme into
    ARPABET, then a segmental duration model with phrase-final and word-final
    lengthening. Each phoneme carries the Oculus viseme it maps to, so the
    output drives a mouth rig directly.

    Passing ``audio_path`` with the gated engine provisioned measures the word
    boundaries from the recording by CTC forced alignment instead of modelling
    them; ``source`` in the response says which happened.
    """
    try:
        result = generate_lip_sync_data(
            body.dialogue,
            speaking_rate=body.speaking_rate,
            audio_path=body.audio_path,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    phonemes = result["phonemes"]
    duration = phonemes[-1]["end_ms"] if phonemes else 0

    return LipSyncResponse(
        phonemes=phonemes,
        source=result["source"],
        duration_ms=duration,
        engine=result["engine"],
    )
