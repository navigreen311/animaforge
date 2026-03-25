"""Tests for video generation endpoints and credit calculation."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from services.ai_api.src.routes.generate import router
from services.ai_api.src.services.video_service import (
    calculate_credit_cost,
    create_video_job,
    estimate_generation_time,
    get_pipeline_stages,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


# ---------------------------------------------------------------------------
# Endpoint tests
# ---------------------------------------------------------------------------


class TestGenerateVideoEndpoint:
    """POST /ai/v1/generate/video"""

    def test_returns_job_id(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/video",
            json={
                "shot_id": "shot-001",
                "tier": "preview",
                "scene_graph": {"objects": []},
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "job_id" in data
        assert isinstance(data["job_id"], str)
        assert len(data["job_id"]) > 0

    def test_returns_estimated_seconds(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/video",
            json={
                "shot_id": "shot-002",
                "tier": "standard",
                "scene_graph": {"objects": ["char_a"]},
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "estimated_seconds" in data
        assert data["estimated_seconds"] > 0

    def test_returns_preview_url(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/video",
            json={
                "shot_id": "shot-003",
                "scene_graph": {"objects": []},
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["preview_url"].startswith("https://cdn.animaforge.ai/preview/")

    def test_invalid_tier_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/video",
            json={
                "shot_id": "shot-err",
                "tier": "ultra",
                "scene_graph": {},
            },
        )
        assert resp.status_code == 422


class TestEditInstructionEndpoint:
    """POST /ai/v1/edit/instruction"""

    def test_returns_job_id(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/edit/instruction",
            json={
                "shot_id": "shot-010",
                "output_id": "out-001",
                "instruction": "Make the sky more dramatic",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "job_id" in data


class TestDirectorAssembleEndpoint:
    """POST /ai/v1/director/assemble"""

    def test_returns_rough_cut_url(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/director/assemble",
            json={
                "project_id": "proj-001",
                "shot_ids": ["shot-001", "shot-002"],
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "job_id" in data
        assert data["rough_cut_url"].startswith(
            "https://cdn.animaforge.ai/roughcut/"
        )


# ---------------------------------------------------------------------------
# Service / credit calculation tests
# ---------------------------------------------------------------------------


class TestCreditCalculation:
    """Unit tests for calculate_credit_cost."""

    def test_preview_cost(self) -> None:
        cost = calculate_credit_cost("preview", 5_000)
        assert cost == 1.0  # 5000 * 0.0002 * 1.0

    def test_standard_cost(self) -> None:
        cost = calculate_credit_cost("standard", 5_000)
        assert cost == 2.5  # 5000 * 0.0002 * 2.5

    def test_high_cost(self) -> None:
        cost = calculate_credit_cost("high", 5_000)
        assert cost == 5.0  # 5000 * 0.0002 * 5.0

    def test_default_duration(self) -> None:
        cost = calculate_credit_cost("preview")
        assert cost == 1.0  # uses default 5000 ms

    def test_unknown_tier_falls_back_to_preview(self) -> None:
        cost = calculate_credit_cost("unknown", 5_000)
        assert cost == calculate_credit_cost("preview", 5_000)


class TestEstimateGenerationTime:
    """Unit tests for estimate_generation_time."""

    def test_preview_faster_than_high(self) -> None:
        preview = estimate_generation_time("preview", 10_000)
        high = estimate_generation_time("high", 10_000)
        assert preview < high

    def test_positive_result(self) -> None:
        result = estimate_generation_time("standard")
        assert result > 0


class TestPipelineStages:
    """Unit tests for get_pipeline_stages."""

    def test_returns_eleven_stages(self) -> None:
        stages = get_pipeline_stages()
        assert len(stages) == 11

    def test_stages_have_required_keys(self) -> None:
        for stage in get_pipeline_stages():
            assert "name" in stage
            assert "description" in stage
            assert "estimated_seconds" in stage


class TestCreateVideoJob:
    """Unit tests for create_video_job."""

    def test_returns_id_and_status(self) -> None:
        job = create_video_job({"tier": "preview"})
        assert "id" in job
        assert job["status"] == "queued"

    def test_includes_credit_cost(self) -> None:
        job = create_video_job({"tier": "high", "duration_ms": 10_000})
        assert job["credit_cost"] > 0
