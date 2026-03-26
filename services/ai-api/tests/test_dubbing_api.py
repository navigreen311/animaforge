"Async pytest suite for AI Dubbing and Localization API routes."

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient

from src.routes.dubbing import router

BASE = "http://test"


@pytest.fixture()
def api_client():
    app = FastAPI()
    app.include_router(router)

    @app.exception_handler(ValueError)
    async def value_error_handler(request, exc: ValueError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url=BASE)


@pytest.mark.asyncio
async def test_translate_script(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/dubbing/translate",
            json={
                "script": "The quick brown fox jumps",
                "source_lang": "en",
                "target_lang": "fr",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["translated_script"].startswith("[fr]")
    assert data["word_count"] == 5
    assert 0 < data["confidence"] <= 1.0


@pytest.mark.asyncio
async def test_generate_dubbed_audio(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/dubbing/generate",
            json={
                "dialogue": "Hello world",
                "target_lang": "es",
                "voice_id": "voice-es-1",
                "preserve_emotion": True,
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"].startswith("dub-")
    assert data["audio_url"].endswith(".wav")
    assert data["duration_ms"] > 0


@pytest.mark.asyncio
async def test_lip_sync(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/dubbing/lip-sync",
            json={
                "video_url": "https://example.com/scene.mp4",
                "new_audio_url": "https://example.com/dubbed.wav",
                "target_lang": "ja",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"].startswith("sync-")
    assert 0 < data["sync_quality"] <= 1.0


@pytest.mark.asyncio
async def test_batch_dub(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/dubbing/batch",
            json={
                "project_id": "proj-10",
                "target_langs": ["es", "fr", "de", "ja"],
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["project_id"] == "proj-10"
    assert len(data["jobs"]) == 4
    assert all(j["status"] == "queued" for j in data["jobs"])


@pytest.mark.asyncio
async def test_language_list(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.get("/ai/v1/dubbing/languages")
    assert resp.status_code == 200
    langs = resp.json()
    assert len(langs) >= 20
    codes = {l["code"] for l in langs}
    assert "en" in codes
    assert "ja" in codes


@pytest.mark.asyncio
async def test_detect_language(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/dubbing/detect-language",
            json={"text": "Bonjour le monde"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "code" in data
    assert "name" in data
    assert data["confidence"] > 0
