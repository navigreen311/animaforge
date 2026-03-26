"Async pytest suite for Generative Memory API routes (G8)."

from __future__ import annotations

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from src.routes.memory import router
from src.services.memory_service import _memory_store, _style_store

BASE = "http://test"


@pytest.fixture(autouse=True)
def _clear_stores():
    _memory_store.clear()
    _style_store.clear()
    yield
    _memory_store.clear()
    _style_store.clear()


@pytest.fixture()
def api_client():
    app = FastAPI()
    app.include_router(router)
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url=BASE)


@pytest.mark.asyncio
async def test_store_context(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/memory/store",
            json={
                "user_id": "u-api-1",
                "project_id": "p-1",
                "context": {"prompt": "cyberpunk rooftop", "steps": 40},
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    assert data["project_id"] == "p-1"
    assert "created_at" in data


@pytest.mark.asyncio
async def test_recall_context(api_client: AsyncClient) -> None:
    async with api_client as c:
        await c.post(
            "/ai/v1/memory/store",
            json={
                "user_id": "u-api-2",
                "project_id": "p-1",
                "context": {"prompt": "ocean sunset golden hour"},
            },
        )
        await c.post(
            "/ai/v1/memory/store",
            json={
                "user_id": "u-api-2",
                "project_id": "p-1",
                "context": {"prompt": "dark alley at night"},
            },
        )
        resp = await c.post(
            "/ai/v1/memory/recall",
            json={
                "user_id": "u-api-2",
                "project_id": "p-1",
                "query": "ocean sunset",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 2
    assert data["results"][0]["similarity"] >= data["results"][1]["similarity"]


@pytest.mark.asyncio
async def test_style_preference(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/memory/style-preference",
            json={
                "user_id": "u-api-3",
                "style_fingerprint": {"palette": "warm", "contrast": "high"},
                "rating": 4.5,
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    assert data["rating"] == 4.5
    assert data["style_fingerprint"]["palette"] == "warm"


@pytest.mark.asyncio
async def test_suggest_params(api_client: AsyncClient) -> None:
    async with api_client as c:
        await c.post(
            "/ai/v1/memory/store",
            json={
                "user_id": "u-api-4",
                "project_id": "p-1",
                "context": {"prompt": "forest path morning", "steps": 50, "cfg": 8.0},
            },
        )
        resp = await c.post(
            "/ai/v1/memory/suggest",
            json={"user_id": "u-api-4", "prompt": "forest trail"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] >= 1
    assert "context" in data["suggestions"][0]
    assert "similarity" in data["suggestions"][0]


@pytest.mark.asyncio
async def test_user_profile(api_client: AsyncClient) -> None:
    async with api_client as c:
        await c.post(
            "/ai/v1/memory/store",
            json={
                "user_id": "u-api-5",
                "project_id": "p-1",
                "context": {"prompt": "landscape", "steps": 30, "cfg": 7.0},
            },
        )
        await c.post(
            "/ai/v1/memory/store",
            json={
                "user_id": "u-api-5",
                "project_id": "p-1",
                "context": {"prompt": "portrait", "steps": 50, "cfg": 8.0},
            },
        )
        resp = await c.get("/ai/v1/memory/profile/u-api-5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["generation_count"] == 2
    assert data["avg_parameters"]["steps"] == 40.0
    assert data["avg_parameters"]["cfg"] == 7.5


@pytest.mark.asyncio
async def test_clear_memory(api_client: AsyncClient) -> None:
    async with api_client as c:
        await c.post(
            "/ai/v1/memory/store",
            json={
                "user_id": "u-api-6",
                "project_id": "p-1",
                "context": {"prompt": "test"},
            },
        )
        resp = await c.delete("/ai/v1/memory/u-api-6")
    assert resp.status_code == 200
    assert resp.json()["removed"] >= 1
