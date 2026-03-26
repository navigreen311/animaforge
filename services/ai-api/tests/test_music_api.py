"Async pytest suite for AI Music Composition API routes."

from __future__ import annotations

import pytest
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient

from src.routes.music import router

BASE = "http://test"


@pytest.fixture()
def api_client():
    app = FastAPI()
    app.include_router(router)

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url=BASE)


@pytest.mark.asyncio
async def test_generate_score(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/music/score",
            json={
                "project_id": "proj-1",
                "scene_analysis": {"intensity_curve": [0.2, 0.7, 0.9]},
                "mood": "tense",
                "duration_ms": 60000,
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"].startswith("music-")
    assert "cue_sheet" in data
    assert data["cue_sheet"]["tempo"] > 0
    assert data["cue_sheet"]["time_signature"] == "4/4"


@pytest.mark.asyncio
async def test_analyze_scene(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/music/analyze-scene",
            json={
                "scene_graphs": [
                    {"emotion": "joy", "duration_ms": 5000, "energy": 0.8},
                    {"emotion": "sadness", "duration_ms": 3000, "energy": 0.2},
                ],
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["emotional_arc"]) == 2
    assert "pacing_profile" in data
    assert "suggested_tempo" in data
    assert len(data["intensity_curve"]) == 2


@pytest.mark.asyncio
async def test_generate_stems(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/music/stems",
            json={
                "job_id": "music-abc",
                "stem_types": ["melody", "drums", "bass"],
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["stems"]) == 3
    types = {s["type"] for s in data["stems"]}
    assert types == {"melody", "drums", "bass"}


@pytest.mark.asyncio
async def test_beat_detection(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/music/detect-beats",
            json={"audio_url": "https://cdn.example.com/track.wav"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["bpm"] == 120
    assert data["time_signature"] == "4/4"
    assert len(data["beats_ms"]) > 0
    assert len(data["downbeats_ms"]) > 0


@pytest.mark.asyncio
async def test_mix_stems(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/music/mix",
            json={
                "stems": [
                    {"type": "melody", "url": "https://x/a.wav", "duration_ms": 60000},
                    {"type": "drums", "url": "https://x/b.wav", "duration_ms": 60000},
                ],
                "mix_params": {"master_volume": 0.9},
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["mixed_url"].endswith(".wav")
    assert data["duration_ms"] == 60000


@pytest.mark.asyncio
async def test_sfx_generation(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/music/sfx",
            json={
                "scene_desc": "A thunderstorm over a city",
                "timestamps": [500, 2000, 4500],
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["sfx"]) == 3
    for sfx in data["sfx"]:
        assert "type" in sfx
        assert "url" in sfx
        assert "timestamp_ms" in sfx
