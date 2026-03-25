"""AI dubbing and localization routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..services.dubbing_service import (
    batch_dub_project,
    detect_language,
    generate_dubbed_audio,
    get_supported_languages,
    lip_sync_adjust,
    translate_script,
)

router = APIRouter(prefix="/ai/v1")


# ── Request / Response schemas ───────────────────────────────────────────────


class TranslateRequest(BaseModel):
    script: str
    source_lang: str
    target_lang: str


class TranslateResponse(BaseModel):
    translated_script: str
    word_count: int
    confidence: float


class GenerateDubRequest(BaseModel):
    dialogue: str
    target_lang: str
    voice_id: str
    preserve_emotion: bool = True


class GenerateDubResponse(BaseModel):
    job_id: str
    audio_url: str
    duration_ms: int


class LipSyncRequest(BaseModel):
    video_url: str
    new_audio_url: str
    target_lang: str


class LipSyncResponse(BaseModel):
    job_id: str
    synced_video_url: str
    sync_quality: float


class BatchDubRequest(BaseModel):
    project_id: str
    target_langs: list[str] = Field(min_length=1)


class BatchDubJob(BaseModel):
    lang: str
    status: str
    progress: int
    job_id: str


class BatchDubResponse(BaseModel):
    project_id: str
    jobs: list[BatchDubJob]


class DetectLanguageRequest(BaseModel):
    text: str


class DetectLanguageResponse(BaseModel):
    code: str
    name: str
    confidence: float


class SupportedLanguage(BaseModel):
    code: str
    name: str
    tts_available: bool
    translation_quality: str


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/dubbing/translate", response_model=TranslateResponse)
async def translate(body: TranslateRequest) -> TranslateResponse:
    """Translate a script between supported languages."""
    result = translate_script(body.script, body.source_lang, body.target_lang)
    return TranslateResponse(**result)


@router.post("/dubbing/generate", response_model=GenerateDubResponse)
async def generate(body: GenerateDubRequest) -> GenerateDubResponse:
    """Generate dubbed audio via TTS in the target language."""
    result = generate_dubbed_audio(
        body.dialogue, body.target_lang, body.voice_id, body.preserve_emotion
    )
    return GenerateDubResponse(**result)


@router.post("/dubbing/lip-sync", response_model=LipSyncResponse)
async def lip_sync(body: LipSyncRequest) -> LipSyncResponse:
    """Adjust lip sync for dubbed audio against a video."""
    result = lip_sync_adjust(body.video_url, body.new_audio_url, body.target_lang)
    return LipSyncResponse(**result)


@router.post("/dubbing/batch", response_model=BatchDubResponse)
async def batch(body: BatchDubRequest) -> BatchDubResponse:
    """Batch-dub a project into multiple target languages."""
    result = batch_dub_project(body.project_id, body.target_langs)
    return BatchDubResponse(**result)


@router.get("/dubbing/languages", response_model=list[SupportedLanguage])
async def languages() -> list[dict[str, Any]]:
    """Return all supported dubbing languages."""
    return get_supported_languages()


@router.post("/dubbing/detect-language", response_model=DetectLanguageResponse)
async def detect_lang(body: DetectLanguageRequest) -> DetectLanguageResponse:
    """Auto-detect the language of the given text."""
    result = detect_language(body.text)
    return DetectLanguageResponse(**result)
