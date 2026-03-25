"""Tests for AI dubbing and localization pipeline."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.dubbing import router
from src.services.dubbing_service import (
    SUPPORTED_LANGUAGES,
    detect_language,
    generate_dubbed_audio,
    get_supported_languages,
    lip_sync_adjust,
    preserve_timing,
    translate_script,
)

# ── App fixture ──────────────────────────────────────────────────────────────


@pytest.fixture()
def client() -> TestClient:
    from fastapi.responses import JSONResponse

    app = FastAPI()
    app.include_router(router)

    @app.exception_handler(ValueError)
    async def value_error_handler(request, exc: ValueError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    return TestClient(app)


# ── Service-layer unit tests ────────────────────────────────────────────────


class TestDubbingService:
    def test_translate_script_returns_translation(self) -> None:
        result = translate_script("Hello world", "en", "es")
        assert result["translated_script"] == "[es] Hello world"
        assert result["word_count"] == 2
        assert 0 < result["confidence"] <= 1.0

    def test_generate_dubbed_audio_returns_job(self) -> None:
        result = generate_dubbed_audio("To be or not to be", "fr", "voice-1")
        assert result["job_id"].startswith("dub-")
        assert result["audio_url"].endswith(".wav")
        assert result["duration_ms"] > 0

    def test_lip_sync_adjust_returns_synced_video(self) -> None:
        result = lip_sync_adjust(
            "https://example.com/video.mp4",
            "https://example.com/audio.wav",
            "es",
        )
        assert result["job_id"].startswith("sync-")
        assert result["synced_video_url"].endswith(".mp4")
        assert 0 < result["sync_quality"] <= 1.0

    def test_get_supported_languages_has_at_least_20(self) -> None:
        langs = get_supported_languages()
        assert len(langs) >= 20
        codes = {lang["code"] for lang in langs}
        assert "en" in codes
        assert "ja" in codes

    def test_detect_language_japanese(self) -> None:
        result = detect_language("\u3053\u3093\u306b\u3061\u306f")
        assert result["code"] == "ja"
        assert result["confidence"] > 0

    def test_detect_language_defaults_to_english(self) -> None:
        result = detect_language("Hello there")
        assert result["code"] == "en"

    def test_preserve_timing_returns_accuracy(self) -> None:
        result = preserve_timing(
            "https://example.com/original.wav",
            "https://example.com/dubbed.wav",
        )
        assert result["adjusted_audio_url"].endswith(".wav")
        assert 0 < result["timing_accuracy"] <= 1.0

    def test_translate_script_invalid_language_raises(self) -> None:
        with pytest.raises(ValueError, match="Unsupported language code"):
            translate_script("Hello", "en", "xx")


# ── Route / integration tests ───────────────────────────────────────────────


class TestDubbingEndpoints:
    def test_translate_endpoint(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/dubbing/translate",
            json={
                "script": "Good morning",
                "source_lang": "en",
                "target_lang": "de",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["translated_script"].startswith("[de]")
        assert data["word_count"] == 2

    def test_generate_endpoint(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/dubbing/generate",
            json={
                "dialogue": "Lights camera action",
                "target_lang": "ja",
                "voice_id": "voice-jp-1",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "job_id" in data
        assert data["duration_ms"] > 0

    def test_lip_sync_endpoint(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/dubbing/lip-sync",
            json={
                "video_url": "https://example.com/v.mp4",
                "new_audio_url": "https://example.com/a.wav",
                "target_lang": "ko",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["sync_quality"] > 0

    def test_batch_endpoint(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/dubbing/batch",
            json={
                "project_id": "proj-42",
                "target_langs": ["es", "fr", "de"],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["jobs"]) == 3
        assert all(j["status"] == "queued" for j in data["jobs"])

    def test_languages_endpoint(self, client: TestClient) -> None:
        resp = client.get("/ai/v1/dubbing/languages")
        assert resp.status_code == 200
        langs = resp.json()
        assert len(langs) >= 20

    def test_detect_language_endpoint(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/dubbing/detect-language",
            json={"text": "Bonjour le monde"},
        )
        assert resp.status_code == 200
        assert "code" in resp.json()

    def test_translate_invalid_lang_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/dubbing/translate",
            json={
                "script": "Hello",
                "source_lang": "en",
                "target_lang": "zz",
            },
        )
        assert resp.status_code == 422

    def test_batch_empty_langs_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/dubbing/batch",
            json={
                "project_id": "proj-1",
                "target_langs": [],
            },
        )
        assert resp.status_code == 422
