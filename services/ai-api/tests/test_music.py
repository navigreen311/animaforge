"""Tests for AI music composition service and endpoints."""

from __future__ import annotations

import pytest
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from src.routes.music import router
from src.services.music_service import (
    analyze_scene_for_music,
    detect_beat_grid,
    generate_score,
    generate_sound_effects,
    generate_stems,
    mix_stems,
    sync_to_beats,
)

# ── App fixture ──────────────────────────────────────────────────────────────


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    return TestClient(app)


# ── Service-layer unit tests ────────────────────────────────────────────────


class TestMusicService:
    def test_generate_score_returns_cue_sheet(self) -> None:
        result = generate_score(
            project_id="proj-1",
            scene_analysis={"intensity_curve": [0.3, 0.6, 0.9]},
            mood="tense",
            duration_ms=90_000,
        )
        assert result["job_id"].startswith("music-")
        cue = result["cue_sheet"]
        assert cue["tempo"] == 140
        assert cue["key"] == "D minor"
        assert cue["time_signature"] == "4/4"
        assert len(cue["sections"]) == 3  # 90s / 30s

    def test_generate_score_with_genre(self) -> None:
        result = generate_score(
            project_id="proj-2",
            scene_analysis={},
            mood="happy",
            duration_ms=60_000,
            genre="jazz",
        )
        sections = result["cue_sheet"]["sections"]
        assert all(s["genre"] == "jazz" for s in sections)

    def test_analyze_scene_for_music(self) -> None:
        graphs = [
            {"emotion": "joy", "duration_ms": 4000, "energy": 0.8},
            {"emotion": "sadness", "duration_ms": 6000, "energy": 0.3},
        ]
        result = analyze_scene_for_music(graphs)
        assert len(result["emotional_arc"]) == 2
        assert result["pacing_profile"] == "medium"
        assert len(result["intensity_curve"]) == 2
        assert isinstance(result["suggested_tempo"], int)
        assert result["suggested_key"] in ("C major", "A minor")

    def test_generate_stems_valid(self) -> None:
        result = generate_stems("music-abc123", ["melody", "drums", "bass"])
        assert len(result["stems"]) == 3
        types = {s["type"] for s in result["stems"]}
        assert types == {"melody", "drums", "bass"}
        assert all(s["url"].endswith(".wav") for s in result["stems"])

    def test_generate_stems_invalid_type(self) -> None:
        with pytest.raises(ValueError, match="Invalid stem types"):
            generate_stems("music-abc123", ["melody", "kazoo"])

    def test_mix_stems_returns_mixed_url(self) -> None:
        stems = [
            {"type": "melody", "url": "https://x/a.wav", "duration_ms": 60_000},
            {"type": "drums", "url": "https://x/b.wav", "duration_ms": 90_000},
        ]
        result = mix_stems(stems, {"master_volume": 0.8})
        assert result["mixed_url"].endswith(".wav")
        assert result["duration_ms"] == 90_000

    def test_detect_beat_grid(self) -> None:
        result = detect_beat_grid("https://cdn.example.com/track.wav")
        assert result["bpm"] == 120
        assert result["time_signature"] == "4/4"
        assert len(result["beats_ms"]) > 0
        assert len(result["downbeats_ms"]) > 0
        # Downbeats are every 4th beat
        assert result["downbeats_ms"][0] == result["beats_ms"][0]
        assert result["downbeats_ms"][1] == result["beats_ms"][4]

    def test_sync_to_beats(self) -> None:
        result = sync_to_beats(
            video_url="https://cdn.example.com/video.mp4",
            audio_url="https://cdn.example.com/track.wav",
        )
        assert "synced_video_url" in result
        assert len(result["sync_points"]) > 0
        assert result["bpm"] == 120


# ── Route / integration tests ───────────────────────────────────────────────


class TestMusicEndpoints:
    def test_post_score(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/music/score",
            json={
                "project_id": "proj-1",
                "scene_analysis": {"intensity_curve": [0.5]},
                "mood": "epic",
                "duration_ms": 60_000,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "job_id" in data
        assert data["cue_sheet"]["tempo"] == 150

    def test_post_analyze_scene(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/music/analyze-scene",
            json={
                "scene_graphs": [
                    {"emotion": "fear", "duration_ms": 2000, "energy": 0.9},
                ],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["pacing_profile"] == "fast"
        assert data["emotional_arc"][0]["emotion"] == "fear"

    def test_post_sfx(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/music/sfx",
            json={
                "scene_desc": "A car crashes through a rain-soaked street",
                "timestamps": [1000, 3500, 7000],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["sfx"]) == 3
        sfx_types = {s["type"] for s in data["sfx"]}
        # Should detect "car" -> "engine" and "rain" -> "rain"
        assert "engine" in sfx_types or "rain" in sfx_types

    def test_post_detect_beats(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/music/detect-beats",
            json={"audio_url": "https://cdn.example.com/track.wav"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["bpm"] == 120
        assert len(data["beats_ms"]) > 100

    def test_post_sync(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/music/sync",
            json={
                "video_url": "https://cdn.example.com/video.mp4",
                "audio_url": "https://cdn.example.com/track.wav",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "synced_video_url" in data
        assert len(data["sync_points"]) > 0

    def test_post_stems_invalid_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/music/stems",
            json={"job_id": "music-123", "stem_types": ["melody", "kazoo"]},
        )
        assert resp.status_code == 422

    def test_post_score_missing_field_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/music/score",
            json={"project_id": "proj-1"},
        )
        assert resp.status_code == 422
