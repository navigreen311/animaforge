"""Tests for AI audio generation and music composition endpoints."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.models.audio_schemas import GenerateAudioRequest, MusicScoreRequest
from src.routes.audio import router
from src.services.audio.timing import VISEMES
from src.services.audio_service import (
    create_audio_job,
    create_music_job,
    estimate_audio_time,
    generate_lip_sync_data,
)

# ── App fixture ──────────────────────────────────────────────────────────────


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


# ── Service-layer unit tests ────────────────────────────────────────────────


class TestAudioService:
    def test_create_audio_job_returns_job(self) -> None:
        params = GenerateAudioRequest(
            shot_id="shot-1",
            dialogue="Hello world",
            voice_id="voice-abc",
        )
        job = create_audio_job(params)
        assert job.job_id.startswith("audio-")
        assert job.status == "queued"
        assert job.estimated_seconds > 0

    def test_create_music_job_returns_cue_sheet(self) -> None:
        params = MusicScoreRequest(
            project_id="proj-1",
            cut_url="https://example.com/cut.mp4",
            mood="tense",
            stems=["strings", "drums"],
        )
        job = create_music_job(params)
        assert job.cue_sheet is not None
        assert job.cue_sheet.stems == ["strings", "drums"]
        assert job.cue_sheet.title == "Tense Score"

    def test_generate_lip_sync_data_returns_phonemes(self) -> None:
        """The contract changed: this returns a result object, not a bare list.

        The previous shape was a flat list of one entry per *letter*. That was
        not a phoneme timeline, so the assertions that guarded it were
        guarding the wrong thing.
        """
        result = generate_lip_sync_data("Hi there")
        timeline = result["phonemes"]

        assert len(timeline) > 0
        first = timeline[0]
        assert first["start_ms"] == 0
        assert first["end_ms"] > first["start_ms"]
        assert first["viseme"] in VISEMES
        assert result["source"] == "duration-model"
        assert result["engine"]["is_mock"] is False

    def test_generate_lip_sync_data_empty_string(self) -> None:
        result = generate_lip_sync_data("")
        assert result["phonemes"] == []
        # Still labelled, so a caller inspecting an empty result can tell the
        # difference between "nothing to say" and "no engine".
        assert result["engine"]["is_mock"] is False

    def test_estimate_audio_time(self) -> None:
        result = estimate_audio_time(10_000)
        assert result == 4.0  # 10s * 0.4

    def test_estimate_audio_time_zero(self) -> None:
        assert estimate_audio_time(0) == 0.0


# ── Route / integration tests ───────────────────────────────────────────────


class TestGenerateAudioEndpoint:
    def test_success(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/audio",
            json={
                "shot_id": "shot-42",
                "dialogue": "To be or not to be",
                "voice_id": "voice-1",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "job_id" in data
        assert data["estimated_seconds"] > 0

    def test_with_optional_fields(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/audio",
            json={
                "shot_id": "shot-42",
                "dialogue": "Hello",
                "voice_id": "voice-1",
                "sfx_desc": "rain in background",
                "beat_sync": True,
            },
        )
        assert resp.status_code == 200

    def test_missing_required_field(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/audio",
            json={"shot_id": "shot-42"},
        )
        assert resp.status_code == 422


class TestMusicScoreEndpoint:
    def test_success(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/music/score",
            json={
                "project_id": "proj-7",
                "cut_url": "https://example.com/cut.mp4",
                "mood": "uplifting",
                "stems": ["piano", "strings"],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "job_id" in data
        assert data["cue_sheet"]["title"] == "Uplifting Score"
        assert data["cue_sheet"]["stems"] == ["piano", "strings"]

    def test_missing_required_field(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/music/score",
            json={"project_id": "proj-7"},
        )
        assert resp.status_code == 422
