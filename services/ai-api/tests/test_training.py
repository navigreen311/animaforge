"""Tests for the training data feedback pipeline."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.training import router
from src.services.training_service import (
    FEEDBACK_TYPES,
    _reset_stores,
    aggregate_training_data,
    collect_feedback,
    create_dataset,
    evaluate_model,
    promote_model,
    rollback_model,
    submit_finetune_job,
)

# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _clean_stores():
    """Reset in-memory stores before every test."""
    _reset_stores()
    yield
    _reset_stores()


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


# ── Helpers ──────────────────────────────────────────────────────────────────


def _seed_feedback(n: int = 10, rating: int = 5) -> None:
    """Insert *n* feedback records at the given rating."""
    for i in range(n):
        collect_feedback(
            job_id=f"job-{i}",
            user_id="user-1",
            rating=rating,
            feedback_type="quality",
            details=f"sample {i}",
        )


def _seed_dataset(name: str = "ds-1", model_id: str = "model-a") -> str:
    """Seed feedback + create a dataset.  Returns dataset_id."""
    _seed_feedback(20, rating=5)
    ds = create_dataset(name=name, model_id=model_id)
    return ds["dataset_id"]


# ── Service-layer unit tests ────────────────────────────────────────────────


class TestCollectFeedback:
    def test_valid_feedback(self) -> None:
        result = collect_feedback(
            job_id="job-1",
            user_id="user-1",
            rating=4,
            feedback_type="quality",
            details="looks great",
        )
        assert result["job_id"] == "job-1"
        assert result["rating"] == 4
        assert "feedback_id" in result

    def test_invalid_feedback_type(self) -> None:
        with pytest.raises(ValueError, match="Invalid feedback_type"):
            collect_feedback("j", "u", 3, "bogus")

    def test_invalid_rating(self) -> None:
        with pytest.raises(ValueError, match="Rating must be"):
            collect_feedback("j", "u", 0, "quality")


class TestAggregateTrainingData:
    def test_aggregate_filters_by_min_rating(self) -> None:
        _seed_feedback(5, rating=5)
        _seed_feedback(5, rating=2)
        agg = aggregate_training_data("model-a", min_rating=4)
        assert agg["count"] == 5
        assert agg["avg_rating"] == 5.0


class TestCreateDataset:
    def test_default_split(self) -> None:
        _seed_feedback(20, rating=5)
        ds = create_dataset("ds-1", "model-a")
        assert "dataset_id" in ds
        total = ds["train_count"] + ds["val_count"] + ds["test_count"]
        assert total == 20

    def test_invalid_split_ratio(self) -> None:
        with pytest.raises(ValueError, match="split_ratio must sum to 1.0"):
            create_dataset("ds-x", "m", split_ratio={"train": 0.5, "val": 0.1, "test": 0.1})


class TestFinetuneWorkflow:
    def test_submit_and_list(self) -> None:
        ds_id = _seed_dataset()
        job = submit_finetune_job(ds_id, "model-a")
        assert job["job_id"].startswith("ft-")
        assert job["estimated_hours"] > 0

        jobs = __import__(
            "src.services.training_service", fromlist=["list_finetune_jobs"]
        ).list_finetune_jobs("model-a")
        assert len(jobs) == 1

    def test_submit_missing_dataset(self) -> None:
        with pytest.raises(ValueError, match="not found"):
            submit_finetune_job("nonexistent", "model-a")


class TestEvaluateModel:
    def test_evaluate_returns_metrics(self) -> None:
        ds_id = _seed_dataset()
        result = evaluate_model("model-a", ds_id)
        assert 0.0 <= result["accuracy"] <= 1.0
        assert "lpips_mean" in result
        assert "identity_score" in result
        assert "user_preference_score" in result


class TestPromoteAndRollback:
    def test_promote_and_rollback(self) -> None:
        promote_model("model-a", "staging")
        promote_model("model-a", "production")
        rb = rollback_model("model-a")
        assert rb["status"] == "rolled_back"
        assert rb["environment"] == "staging"

    def test_rollback_insufficient_versions(self) -> None:
        with pytest.raises(ValueError, match="fewer than 2"):
            rollback_model("model-a")


# ── Route / integration test ────────────────────────────────────────────────


class TestFeedbackEndpoint:
    def test_post_feedback_success(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/training/feedback",
            json={
                "job_id": "job-99",
                "user_id": "user-1",
                "rating": 5,
                "feedback_type": "style_match",
                "details": "perfect match",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["feedback_type"] == "style_match"
        assert "feedback_id" in data

    def test_post_feedback_invalid_type(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/training/feedback",
            json={
                "job_id": "job-99",
                "user_id": "user-1",
                "rating": 3,
                "feedback_type": "invalid_type",
            },
        )
        assert resp.status_code == 422
