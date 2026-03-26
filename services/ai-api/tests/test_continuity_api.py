"""Async pytest suite for Continuity API routes (E6)."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from src.routes.continuity import router

BASE = "http://test"


@pytest.fixture()
def api_client():
    """Standalone app with the continuity router."""
    app = FastAPI()
    app.include_router(router)
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url=BASE)


def _consistent_shots() -> list[dict]:
    return [
        {
            "shot_id": "s1",
            "character_ref": "hero-v1",
            "style_ref": "cinematic-warm",
            "characters": ["alice", "bob"],
            "audio_level_db": -14.0,
        },
        {
            "shot_id": "s2",
            "character_ref": "hero-v1",
            "style_ref": "cinematic-warm",
            "characters": ["alice", "bob"],
            "audio_level_db": -14.0,
        },
    ]


def _character_drift_shots() -> list[dict]:
    return [
        {
            "shot_id": "s1",
            "character_ref": "hero-v1",
            "style_ref": "cinematic-warm",
            "characters": ["alice", "bob"],
            "audio_level_db": -14.0,
        },
        {
            "shot_id": "s2",
            "character_ref": "totally-different",
            "style_ref": "cinematic-warm",
            "characters": ["alice", "bob"],
            "audio_level_db": -14.0,
        },
    ]


def _style_drift_shots() -> list[dict]:
    return [
        {
            "shot_id": "s1",
            "character_ref": "hero-v1",
            "style_ref": "cinematic-warm",
            "characters": ["alice"],
            "audio_level_db": -14.0,
        },
        {
            "shot_id": "s2",
            "character_ref": "hero-v1",
            "style_ref": "anime-flat",
            "characters": ["alice"],
            "audio_level_db": -14.0,
        },
    ]


# -- 1. Consistent shots pass --


@pytest.mark.asyncio
async def test_check_consistent_shots(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/continuity/check",
            json={
                "project_id": "proj-1",
                "shot_ids": ["s1", "s2"],
                "shots": _consistent_shots(),
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_score"] == 1.0
    assert data["issues"] == []


# -- 2. Character drift detected --


@pytest.mark.asyncio
async def test_detect_character_drift(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/continuity/check",
            json={
                "project_id": "proj-1",
                "shot_ids": ["s1", "s2"],
                "shots": _character_drift_shots(),
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_score"] < 1.0
    issue_types = [i["type"] for i in data["issues"]]
    assert "character_drift" in issue_types


# -- 3. Style drift detected --


@pytest.mark.asyncio
async def test_detect_style_drift(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/continuity/check",
            json={
                "project_id": "proj-1",
                "shot_ids": ["s1", "s2"],
                "shots": _style_drift_shots(),
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_score"] < 1.0
    issue_types = [i["type"] for i in data["issues"]]
    assert "style_mismatch" in issue_types


# -- 4. Fix suggestions returned --


@pytest.mark.asyncio
async def test_fix_suggestions(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/continuity/check",
            json={
                "project_id": "proj-1",
                "shot_ids": ["s1", "s2"],
                "shots": _character_drift_shots(),
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["fixes"]) == len(data["issues"])
    for fix in data["fixes"]:
        assert "suggestion" in fix
        assert "auto_fixable" in fix


# -- 5. Empty shots handled --


@pytest.mark.asyncio
async def test_empty_shots_returns_clean(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/continuity/check",
            json={"project_id": "proj-1", "shot_ids": [], "shots": []},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_score"] == 1.0
    assert data["issues"] == []
    assert "warnings" in data


# -- 6. Fix endpoint integration --


@pytest.mark.asyncio
async def test_fix_endpoint_auto_and_manual(api_client: AsyncClient) -> None:
    async with api_client as c:
        auto_resp = await c.post(
            "/ai/v1/continuity/fix",
            json={
                "project_id": "proj-1",
                "issue_id": "issue-abc",
                "auto_fix": True,
            },
        )
        manual_resp = await c.post(
            "/ai/v1/continuity/fix",
            json={
                "project_id": "proj-1",
                "issue_id": "issue-abc",
                "auto_fix": False,
            },
        )
    assert auto_resp.status_code == 200
    assert auto_resp.json()["status"] == "fix_applied"
    assert manual_resp.status_code == 200
    assert manual_resp.json()["status"] == "manual_review"
