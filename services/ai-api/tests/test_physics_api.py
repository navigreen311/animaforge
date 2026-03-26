"Async pytest suite for Physics Simulation API routes (F5)."

from __future__ import annotations

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from src.routes.physics import router

BASE = "http://test"


@pytest.fixture()
def api_client():
    app = FastAPI()
    app.include_router(router)
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url=BASE)


@pytest.mark.asyncio
async def test_cloth_simulation(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/physics/cloth",
            json={
                "character_id": "char-01",
                "garment_params": {"material": "silk", "vertex_count": 512},
                "motion_data": {"duration_ms": 1000},
                "fps": 30,
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["character_id"] == "char-01"
    assert data["material"] == "silk"
    assert data["frame_count"] == 30
    assert 0 <= data["stability_score"] <= 1.0
    assert len(data["frames"]) == 30


@pytest.mark.asyncio
async def test_hair_simulation(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/physics/hair",
            json={
                "character_id": "char-02",
                "hair_params": {"strand_count": 4000, "particles_per_strand": 10},
                "motion_data": {"duration_ms": 2000},
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["strand_count"] == 4000
    assert data["frame_count"] > 0
    assert 0 <= data["flicker_score"] <= 1.0


@pytest.mark.asyncio
async def test_rigid_body_simulation(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/physics/rigid",
            json={
                "objects": [
                    {"id": "box-1", "position": [0, 5, 0], "velocity": [0, 0, 0], "mass": 1.0, "radius": 0.5},
                ],
                "forces": [],
                "duration_ms": 1000,
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["frame_count"] > 0
    assert len(data["objects_final_state"]) == 1
    assert "position" in data["objects_final_state"][0]


@pytest.mark.asyncio
async def test_wind_application(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/physics/wind",
            json={
                "scene_id": "scene-5",
                "wind_direction": [1, 0, 0],
                "wind_strength": 25.0,
                "turbulence": 0.4,
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["scene_id"] == "scene-5"
    assert data["wind_strength"] == 25.0
    assert data["force_vector"] == [25.0, 0.0, 0.0]
    assert data["turbulence"] == 0.4


@pytest.mark.asyncio
async def test_material_presets(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.get("/ai/v1/physics/materials")
    assert resp.status_code == 200
    presets = resp.json()["presets"]
    assert "cotton" in presets
    assert "silk" in presets
    assert "leather" in presets
    for _name, props in presets.items():
        assert "stiffness" in props
        assert "damping" in props


@pytest.mark.asyncio
async def test_invalid_wind_direction_rejected(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/physics/wind",
            json={
                "scene_id": "scene-bad",
                "wind_direction": [1, 0],
                "wind_strength": 10.0,
                "turbulence": 0.0,
            },
        )
    assert resp.status_code == 422
