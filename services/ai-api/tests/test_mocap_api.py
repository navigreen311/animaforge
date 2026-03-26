"Async pytest suite for Motion Capture API routes (E8)."

from __future__ import annotations

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from src.routes.mocap import router

BASE = "http://test"


@pytest.fixture()
def api_client():
    app = FastAPI()
    app.include_router(router)
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url=BASE)


@pytest.mark.asyncio
async def test_bvh_upload(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/mocap/upload",
            json={"file_url": "https://example.com/walk.bvh", "format": "bvh"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["format"] == "bvh"
    assert "motion_id" in data
    assert data["stats"]["joint_count"] == 19
    assert data["stats"]["frame_count"] == 120


@pytest.mark.asyncio
async def test_retarget_motion(api_client: AsyncClient) -> None:
    async with api_client as c:
        upload = await c.post(
            "/ai/v1/mocap/upload",
            json={"file_url": "https://example.com/walk.bvh", "format": "bvh"},
        )
        motion_id = upload.json()["motion_id"]
        resp = await c.post(
            "/ai/v1/mocap/retarget",
            json={"motion_id": motion_id, "character_id": "char-01"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "retargeted_motion_id" in data
    assert 0 < data["compatibility"] <= 1.0


@pytest.mark.asyncio
async def test_blend_motions(api_client: AsyncClient) -> None:
    async with api_client as c:
        up_a = await c.post(
            "/ai/v1/mocap/upload",
            json={"file_url": "https://example.com/walk.bvh", "format": "bvh"},
        )
        up_b = await c.post(
            "/ai/v1/mocap/upload",
            json={"file_url": "https://example.com/run.bvh", "format": "bvh"},
        )
        resp = await c.post(
            "/ai/v1/mocap/blend",
            json={
                "motion_a_id": up_a.json()["motion_id"],
                "motion_b_id": up_b.json()["motion_id"],
                "blend_factor": 0.3,
            },
        )
    assert resp.status_code == 200
    assert "blended_motion_id" in resp.json()


@pytest.mark.asyncio
async def test_apply_to_shot(api_client: AsyncClient) -> None:
    async with api_client as c:
        upload = await c.post(
            "/ai/v1/mocap/upload",
            json={"file_url": "https://example.com/walk.bvh", "format": "bvh"},
        )
        motion_id = upload.json()["motion_id"]
        resp = await c.post(
            "/ai/v1/mocap/apply",
            json={"motion_id": motion_id, "shot_id": "shot-42"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["shot_id"] == "shot-42"
    assert data["keyframe_count"] > 0
    assert data["duration_ms"] > 0


@pytest.mark.asyncio
async def test_list_formats(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.get("/ai/v1/mocap/formats")
    assert resp.status_code == 200
    data = resp.json()
    assert set(data["formats"]) == {"bvh", "fbx", "c3d", "trc"}


@pytest.mark.asyncio
async def test_invalid_format_rejected(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/mocap/upload",
            json={"file_url": "https://example.com/anim.xyz", "format": "xyz"},
        )
    assert resp.status_code == 400
    assert "Unsupported format" in resp.json()["detail"]
