"""Async pytest suite for Training Data Feedback Pipeline API routes."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from src.routes.training import router
from src.services.training_service import (
    _reset_stores,
    collect_feedback,
    create_dataset,
    promote_model,
)

BASE = "http://test"


@pytest.fixture(autouse=True)
def _clean_stores():
    _reset_stores()
    yield
    _reset_stores()


@pytest.fixture()
def api_client():
    """Standalone app with the training router."""
    app = FastAPI()
    app.include_router(router)

    @app.exception_handler(ValueError)
    async def value_error_handler(request, exc: ValueError):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url=BASE)


def _seed_feedback(n: int = 20) -> None:
    for i in range(n):
        collect_feedback(
            job_id=f"job-{i}",
            user_id="user-1",
            rating=5,
            feedback_type="quality",
            details=f"sample {i}",
        )


def _seed_dataset() -> str:
    _seed_feedback(20)
    ds = create_dataset(name="ds-api", model_id="model-a")
    return ds["dataset_id"]


# ── 1. Submit feedback ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_submit_feedback(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/training/feedback",
            json={
                "job_id": "job-42",
                "user_id": "user-1",
                "rating": 4,
                "feedback_type": "quality",
                "details": "good output",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"] == "job-42"
    assert "feedback_id" in data


# ── 2. Create dataset ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_dataset(api_client: AsyncClient) -> None:
    _seed_feedback(20)
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/training/dataset",
            json={"name": "ds-test", "model_id": "model-a"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "dataset_id" in data
    total = data["train_count"] + data["val_count"] + data["test_count"]
    assert total == 20


# ── 3. Submit finetune job ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_finetune_job(api_client: AsyncClient) -> None:
    ds_id = _seed_dataset()
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/training/finetune",
            json={"dataset_id": ds_id, "model_id": "model-a"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"].startswith("ft-")
    assert data["estimated_hours"] > 0


# ── 4. Evaluate model ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_evaluate_model(api_client: AsyncClient) -> None:
    ds_id = _seed_dataset()
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/training/evaluate",
            json={"model_id": "model-a", "test_dataset_id": ds_id},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert 0.0 <= data["accuracy"] <= 1.0
    assert "lpips_mean" in data
    assert "identity_score" in data


# ── 5. Promote model ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_promote_model(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/training/promote",
            json={"model_id": "model-a", "environment": "staging"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["model_id"] == "model-a"
    assert data["environment"] == "staging"
    assert data["status"] == "promoted"


# ── 6. Rollback model ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_rollback_model(api_client: AsyncClient) -> None:
    async with api_client as c:
        # Promote twice to have enough versions
        await c.post(
            "/ai/v1/training/promote",
            json={"model_id": "model-b", "environment": "staging"},
        )
        await c.post(
            "/ai/v1/training/promote",
            json={"model_id": "model-b", "environment": "production"},
        )
        resp = await c.post(
            "/ai/v1/training/rollback",
            json={"model_id": "model-b"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "rolled_back"
