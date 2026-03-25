"""Tests for Generative Memory (G8) endpoints and service logic."""

import math

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app
from src.services.memory_service import (
    _memory_store,
    _style_store,
    cosine_similarity,
)


@pytest.fixture(autouse=True)
def _clear_stores():
    """Ensure a clean slate before every test."""
    _memory_store.clear()
    _style_store.clear()
    yield
    _memory_store.clear()
    _style_store.clear()


BASE = "http://test"


# ---------------------------------------------------------------------------
# 1. Store a generation context
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_store_generation_context():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE) as client:
        resp = await client.post(
            "/ai/v1/memory/store",
            json={
                "user_id": "u1",
                "project_id": "p1",
                "context": {"prompt": "a sunset over the ocean", "steps": 30},
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    assert data["project_id"] == "p1"
    assert "created_at" in data


# ---------------------------------------------------------------------------
# 2. Recall by similarity
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_recall_by_similarity():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE) as client:
        # Store two contexts with different prompts
        await client.post(
            "/ai/v1/memory/store",
            json={
                "user_id": "u1",
                "project_id": "p1",
                "context": {"prompt": "a sunset over the ocean"},
            },
        )
        await client.post(
            "/ai/v1/memory/store",
            json={
                "user_id": "u1",
                "project_id": "p1",
                "context": {"prompt": "a spaceship in deep space"},
            },
        )
        resp = await client.post(
            "/ai/v1/memory/recall",
            json={
                "user_id": "u1",
                "project_id": "p1",
                "query": "ocean sunset",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 2
    # Results should be ordered by similarity (best first)
    assert data["results"][0]["similarity"] >= data["results"][1]["similarity"]


# ---------------------------------------------------------------------------
# 3. Style preferences
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_style_preferences():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE) as client:
        await client.post(
            "/ai/v1/memory/style-preference",
            json={
                "user_id": "u1",
                "style_fingerprint": {"palette": "warm", "contrast": "high"},
                "rating": 4.5,
            },
        )
        await client.post(
            "/ai/v1/memory/style-preference",
            json={
                "user_id": "u1",
                "style_fingerprint": {"palette": "cool", "contrast": "low"},
                "rating": 2.0,
            },
        )
        resp = await client.get("/ai/v1/memory/preferences/u1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 2
    # Highest rated first
    assert data["preferences"][0]["rating"] == 4.5
    assert data["preferences"][1]["rating"] == 2.0


# ---------------------------------------------------------------------------
# 4. Suggest parameters
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_suggest_parameters():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE) as client:
        await client.post(
            "/ai/v1/memory/store",
            json={
                "user_id": "u1",
                "project_id": "p1",
                "context": {"prompt": "cyberpunk city at night", "steps": 50, "cfg": 7.5},
            },
        )
        resp = await client.post(
            "/ai/v1/memory/suggest",
            json={"user_id": "u1", "prompt": "cyberpunk alley"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] >= 1
    assert "context" in data["suggestions"][0]
    assert "similarity" in data["suggestions"][0]


# ---------------------------------------------------------------------------
# 5. User profile
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_user_profile():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE) as client:
        await client.post(
            "/ai/v1/memory/store",
            json={
                "user_id": "u1",
                "project_id": "p1",
                "context": {"prompt": "landscape", "steps": 30, "cfg": 7.0},
            },
        )
        await client.post(
            "/ai/v1/memory/store",
            json={
                "user_id": "u1",
                "project_id": "p1",
                "context": {"prompt": "portrait", "steps": 50, "cfg": 8.0},
            },
        )
        await client.post(
            "/ai/v1/memory/style-preference",
            json={
                "user_id": "u1",
                "style_fingerprint": {"palette": "warm"},
                "rating": 5.0,
            },
        )
        resp = await client.get("/ai/v1/memory/profile/u1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["generation_count"] == 2
    assert data["avg_parameters"]["steps"] == 40.0
    assert data["avg_parameters"]["cfg"] == 7.5
    assert len(data["preferred_styles"]) == 1


# ---------------------------------------------------------------------------
# 6. Clear memory
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_clear_memory():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE) as client:
        await client.post(
            "/ai/v1/memory/store",
            json={
                "user_id": "u1",
                "project_id": "p1",
                "context": {"prompt": "test"},
            },
        )
        resp = await client.delete("/ai/v1/memory/u1")
    assert resp.status_code == 200
    assert resp.json()["removed"] >= 1


# ---------------------------------------------------------------------------
# 7. Empty recall returns empty list
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_empty_recall():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE) as client:
        resp = await client.post(
            "/ai/v1/memory/recall",
            json={
                "user_id": "nobody",
                "project_id": "p1",
                "query": "anything",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 0
    assert data["results"] == []


# ---------------------------------------------------------------------------
# 8. Multiple projects isolation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_multiple_projects():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE) as client:
        await client.post(
            "/ai/v1/memory/store",
            json={
                "user_id": "u1",
                "project_id": "p1",
                "context": {"prompt": "alpha"},
            },
        )
        await client.post(
            "/ai/v1/memory/store",
            json={
                "user_id": "u1",
                "project_id": "p2",
                "context": {"prompt": "beta"},
            },
        )
        resp_p1 = await client.post(
            "/ai/v1/memory/recall",
            json={"user_id": "u1", "project_id": "p1", "query": "alpha"},
        )
        resp_p2 = await client.post(
            "/ai/v1/memory/recall",
            json={"user_id": "u1", "project_id": "p2", "query": "beta"},
        )
    assert resp_p1.json()["count"] == 1
    assert resp_p2.json()["count"] == 1
    # Each project only sees its own context
    assert resp_p1.json()["results"][0]["project_id"] == "p1"
    assert resp_p2.json()["results"][0]["project_id"] == "p2"


# ---------------------------------------------------------------------------
# 9. Cosine similarity math
# ---------------------------------------------------------------------------


def test_cosine_similarity_math():
    # Identical vectors → 1.0
    a = [1.0, 0.0, 0.0]
    assert cosine_similarity(a, a) == pytest.approx(1.0)

    # Orthogonal vectors → 0.0
    b = [0.0, 1.0, 0.0]
    assert cosine_similarity(a, b) == pytest.approx(0.0)

    # Opposite vectors → -1.0
    c = [-1.0, 0.0, 0.0]
    assert cosine_similarity(a, c) == pytest.approx(-1.0)

    # Zero vector → 0.0
    z = [0.0, 0.0, 0.0]
    assert cosine_similarity(a, z) == 0.0

    # Known angle (45°) → cos(45°) ≈ 0.7071
    d = [1.0, 1.0, 0.0]
    assert cosine_similarity(a, d) == pytest.approx(1.0 / math.sqrt(2.0), abs=1e-6)


# ---------------------------------------------------------------------------
# 10. Batch store
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_batch_store():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE) as client:
        ids = []
        for i in range(5):
            resp = await client.post(
                "/ai/v1/memory/store",
                json={
                    "user_id": "u1",
                    "project_id": "p1",
                    "context": {"prompt": f"batch item {i}", "index": i},
                },
            )
            assert resp.status_code == 200
            ids.append(resp.json()["id"])

        # All IDs should be unique
        assert len(set(ids)) == 5

        # Recall should return all 5
        resp = await client.post(
            "/ai/v1/memory/recall",
            json={"user_id": "u1", "project_id": "p1", "query": "batch", "limit": 10},
        )
    assert resp.json()["count"] == 5
