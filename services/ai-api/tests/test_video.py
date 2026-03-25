"""Tests for video generation endpoints and credit calculation."""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure the ai-api src package is importable
_AI_API_ROOT = Path(__file__).resolve().parent.parent
if str(_AI_API_ROOT) not in sys.path:
    sys.path.insert(0, str(_AI_API_ROOT))

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app
from src.services.video_service import (
    calculate_credit_cost,
    create_video_job,
    estimate_generation_time,
    get_pipeline_stages,
)


# ── Generate Video ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_generate_video_returns_job_id():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/v1/generate/video",
            json={
                "shot_id": "shot-001",
                "tier": "preview",
                "scene_graph": {"objects": []},
            },
        )

    assert response.status_code == 201
    data = response.json()
    assert "job_id" in data
    assert isinstance(data["job_id"], str)
    assert len(data["job_id"]) > 0


@pytest.mark.asyncio
async def test_generate_video_returns_estimated_seconds():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/v1/generate/video",
            json={
                "shot_id": "shot-002",
                "tier": "standard",
                "scene_graph": {"objects": ["char_a"]},
            },
        )

    assert response.status_code == 201
    data = response.json()
    assert "estimated_seconds" in data
    assert data["estimated_seconds"] > 0


@pytest.mark.asyncio
async def test_generate_video_returns_preview_url():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/v1/generate/video",
            json={
                "shot_id": "shot-003",
                "scene_graph": {"objects": []},
            },
        )

    assert response.status_code == 201
    data = response.json()
    assert data["preview_url"].startswith("https://cdn.animaforge.ai/preview/")


@pytest.mark.asyncio
async def test_generate_video_invalid_tier_returns_422():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/v1/generate/video",
            json={
                "shot_id": "shot-err",
                "tier": "ultra",
                "scene_graph": {},
            },
        )

    assert response.status_code == 422


# ── Edit Instruction ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_edit_instruction_returns_job_id():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/v1/edit/instruction",
            json={
                "shot_id": "shot-010",
                "output_id": "out-001",
                "instruction": "Make the sky more dramatic",
            },
        )

    assert response.status_code == 201
    data = response.json()
    assert "job_id" in data


# ── Director Assemble ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_director_assemble_returns_rough_cut_url():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/v1/director/assemble",
            json={
                "project_id": "proj-001",
                "shot_ids": ["shot-001", "shot-002"],
            },
        )

    assert response.status_code == 201
    data = response.json()
    assert "job_id" in data
    assert data["rough_cut_url"].startswith("https://cdn.animaforge.ai/roughcut/")


# ── Credit Calculation ───────────────────────────────────────────────────────


def test_credit_cost_preview():
    cost = calculate_credit_cost("preview", 5_000)
    assert cost == 1.0  # 5000 * 0.0002 * 1.0


def test_credit_cost_standard():
    cost = calculate_credit_cost("standard", 5_000)
    assert cost == 2.5  # 5000 * 0.0002 * 2.5


def test_credit_cost_high():
    cost = calculate_credit_cost("high", 5_000)
    assert cost == 5.0  # 5000 * 0.0002 * 5.0


def test_credit_cost_default_duration():
    cost = calculate_credit_cost("preview")
    assert cost == 1.0  # uses default 5000 ms


def test_credit_cost_unknown_tier_falls_back_to_preview():
    cost = calculate_credit_cost("unknown", 5_000)
    assert cost == calculate_credit_cost("preview", 5_000)


# ── Estimate Generation Time ────────────────────────────────────────────────


def test_preview_faster_than_high():
    preview = estimate_generation_time("preview", 10_000)
    high = estimate_generation_time("high", 10_000)
    assert preview < high


def test_estimate_positive_result():
    result = estimate_generation_time("standard")
    assert result > 0


# ── Pipeline Stages ──────────────────────────────────────────────────────────


def test_pipeline_returns_eleven_stages():
    stages = get_pipeline_stages()
    assert len(stages) == 11


def test_pipeline_stages_have_required_keys():
    for stage in get_pipeline_stages():
        assert "name" in stage
        assert "description" in stage
        assert "estimated_seconds" in stage


# ── Create Video Job ─────────────────────────────────────────────────────────


def test_create_video_job_returns_id_and_status():
    job = create_video_job({"tier": "preview"})
    assert "id" in job
    assert job["status"] == "queued"


def test_create_video_job_includes_credit_cost():
    job = create_video_job({"tier": "high", "duration_ms": 10_000})
    assert job["credit_cost"] > 0
