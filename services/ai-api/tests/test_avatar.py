"""Tests for avatar reconstruction endpoint and X5 pipeline service."""

from __future__ import annotations

import sys
from pathlib import Path

# Allow imports from the ai-api package tree.
_AI_API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_AI_API_ROOT))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.avatar import router
from src.services.avatar_service import X5_PIPELINE_STEPS, create_avatar_job


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


class TestGenerateAvatarEndpoint:
    """POST /ai/v1/generate/avatar"""

    def test_returns_201(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/avatar",
            json={
                "character_id": "char-001",
                "photos": [
                    "https://example.com/front.jpg",
                    "https://example.com/side.jpg",
                ],
            },
        )
        assert resp.status_code == 201

    def test_returns_job_id(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/avatar",
            json={
                "character_id": "char-002",
                "photos": ["https://example.com/photo.jpg"],
            },
        )
        data = resp.json()
        assert "job_id" in data
        assert isinstance(data["job_id"], str)
        assert len(data["job_id"]) > 0

    def test_returns_model_url(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/avatar",
            json={
                "character_id": "char-003",
                "photos": ["https://example.com/photo.jpg"],
                "style_mode": "realistic",
            },
        )
        data = resp.json()
        assert "model_url" in data
        assert data["model_url"].startswith(
            "https://cdn.animaforge.ai/avatars/char-003/"
        )
        assert data["model_url"].endswith(".glb")

    def test_returns_rig_url(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/avatar",
            json={
                "character_id": "char-004",
                "photos": ["https://example.com/photo.jpg"],
            },
        )
        data = resp.json()
        assert "rig_url" in data
        assert data["rig_url"].endswith("_rig.json")

    def test_default_style_mode(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/avatar",
            json={
                "character_id": "char-005",
                "photos": ["https://example.com/photo.jpg"],
            },
        )
        assert resp.status_code == 201

    def test_missing_character_id_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/avatar",
            json={"photos": ["https://example.com/photo.jpg"]},
        )
        assert resp.status_code == 422

    def test_missing_photos_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/avatar",
            json={"character_id": "char-err"},
        )
        assert resp.status_code == 422


class TestX5PipelineSteps:
    """Verify the X5 pipeline definition."""

    def test_seven_steps(self) -> None:
        assert len(X5_PIPELINE_STEPS) == 7

    def test_steps_have_name_and_description(self) -> None:
        for step in X5_PIPELINE_STEPS:
            assert "name" in step
            assert "description" in step

    def test_quality_validation_is_last(self) -> None:
        assert X5_PIPELINE_STEPS[-1]["name"] == "quality_validation"


class TestCreateAvatarJob:
    """Unit tests for create_avatar_job."""

    def test_returns_job_id(self) -> None:
        result = create_avatar_job("char-t1", ["photo1.jpg"])
        assert "job_id" in result
        assert isinstance(result["job_id"], str)

    def test_all_steps_completed(self) -> None:
        result = create_avatar_job("char-t2", ["photo1.jpg", "photo2.jpg"])
        assert len(result["steps_completed"]) == 7
        for step in result["steps_completed"]:
            assert step["status"] == "completed"

    def test_identity_score_above_threshold(self) -> None:
        result = create_avatar_job("char-t3", ["photo1.jpg"])
        validation_step = result["steps_completed"][-1]
        assert "metrics" in validation_step
        assert validation_step["metrics"]["identity_score"] > 0.92
        assert validation_step["metrics"]["passed"] is True

    def test_model_and_rig_urls(self) -> None:
        result = create_avatar_job("char-t4", ["photo1.jpg"], style_mode="stylized")
        assert result["model_url"].endswith(".glb")
        assert result["rig_url"].endswith("_rig.json")
        assert "char-t4" in result["model_url"]
