"""Tests for the Continuity Engine (E6) — service and route layers."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.continuity import router
from src.services.continuity_service import (
    check_audio_continuity,
    check_character_consistency,
    check_style_consistency,
    check_temporal_continuity,
    generate_continuity_report,
    suggest_fixes,
)

# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def _consistent_shots() -> list[dict]:
    """Two shots with identical refs — should pass all checks."""
    return [
        {
            "shot_id": "shot-1",
            "character_ref": "hero-v1",
            "style_ref": "cinematic-warm",
            "characters": ["alice", "bob"],
            "audio_level_db": -14.0,
        },
        {
            "shot_id": "shot-2",
            "character_ref": "hero-v1",
            "style_ref": "cinematic-warm",
            "characters": ["alice", "bob"],
            "audio_level_db": -13.5,
        },
    ]


def _drifting_shots() -> list[dict]:
    """Shots with deliberate character and style drift."""
    return [
        {
            "shot_id": "shot-1",
            "character_ref": "hero-v1",
            "style_ref": "cinematic-warm",
            "characters": ["alice", "bob"],
            "audio_level_db": -14.0,
        },
        {
            "shot_id": "shot-2",
            "character_ref": "completely-different-character",
            "style_ref": "anime-flat",
            "characters": ["charlie"],
            "audio_level_db": -2.0,
        },
    ]


# ── Service-layer tests ─────────────────────────────────────────────────────


class TestContinuityService:
    def test_consistent_shots_pass(self) -> None:
        """Identical character/style refs should yield score 1.0."""
        shots = _consistent_shots()
        char = check_character_consistency(shots)
        style = check_style_consistency(shots)
        assert char["score"] == 1.0
        assert char["issues"] == []
        assert style["score"] == 1.0
        assert style["issues"] == []

    def test_character_drift_detected(self) -> None:
        """Different character refs should be flagged."""
        shots = _drifting_shots()
        result = check_character_consistency(shots)
        assert result["score"] < _threshold("character")
        assert len(result["issues"]) == 1
        assert result["issues"][0]["type"] == "character_drift"

    def test_style_mismatch_flagged(self) -> None:
        """Different style refs should be flagged."""
        shots = _drifting_shots()
        result = check_style_consistency(shots)
        assert result["score"] < _threshold("style")
        assert len(result["issues"]) == 1
        assert result["issues"][0]["type"] == "style_mismatch"

    def test_temporal_break_detected(self) -> None:
        """Characters vanishing without a cut should be flagged."""
        shots = _drifting_shots()
        result = check_temporal_continuity(shots)
        assert result["score"] < 1.0
        assert len(result["issues"]) == 1
        assert result["issues"][0]["type"] == "temporal_break"
        assert "alice" in result["issues"][0]["missing_characters"]

    def test_fix_suggestions_generated(self) -> None:
        """Every issue in a report should get a suggestion."""
        shots = _drifting_shots()
        report = generate_continuity_report("proj-1", ["shot-1", "shot-2"], shots)
        fixes = suggest_fixes(report["issues"])
        assert len(fixes) == len(report["issues"])
        for fix in fixes:
            assert "suggestion" in fix
            assert "auto_fixable" in fix

    def test_empty_shots_handled(self) -> None:
        """Empty shot list should return perfect scores."""
        report = generate_continuity_report("proj-1", [], [])
        assert report["overall_score"] == 1.0
        assert report["issues"] == []

    def test_audio_discontinuity_detected(self) -> None:
        """Large audio level jumps should be flagged."""
        shots = _drifting_shots()
        result = check_audio_continuity(shots)
        assert len(result["issues"]) == 1
        assert result["issues"][0]["type"] == "audio_discontinuity"

    def test_single_shot_no_issues(self) -> None:
        """A single shot has nothing to compare — should return clean."""
        shots = [_consistent_shots()[0]]
        assert check_character_consistency(shots) == {"score": 1.0, "issues": []}
        assert check_style_consistency(shots) == {"score": 1.0, "issues": []}
        assert check_temporal_continuity(shots) == {"score": 1.0, "issues": []}
        assert check_audio_continuity(shots) == {"score": 1.0, "issues": []}


# ── Route / integration tests ───────────────────────────────────────────────


class TestContinuityCheckEndpoint:
    def test_check_consistent(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/continuity/check",
            json={
                "project_id": "proj-1",
                "shot_ids": ["shot-1", "shot-2"],
                "shots": _consistent_shots(),
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["overall_score"] == 1.0
        assert data["issues"] == []

    def test_check_with_drift(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/continuity/check",
            json={
                "project_id": "proj-1",
                "shot_ids": ["shot-1", "shot-2"],
                "shots": _drifting_shots(),
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["overall_score"] < 1.0
        assert len(data["issues"]) > 0
        assert len(data["fixes"]) == len(data["issues"])

    def test_check_empty_shots(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/continuity/check",
            json={"project_id": "proj-1", "shot_ids": []},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["overall_score"] == 1.0


class TestContinuityFixEndpoint:
    def test_auto_fix(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/continuity/fix",
            json={
                "project_id": "proj-1",
                "issue_id": "issue-abc123",
                "auto_fix": True,
            },
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "fix_applied"

    def test_manual_fix(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/continuity/fix",
            json={
                "project_id": "proj-1",
                "issue_id": "issue-abc123",
                "auto_fix": False,
            },
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "manual_review"


# ── Helpers ──────────────────────────────────────────────────────────────────


def _threshold(kind: str) -> float:
    from src.services.continuity_service import (
        _CHARACTER_SIMILARITY_THRESHOLD,
        _STYLE_SIMILARITY_THRESHOLD,
    )

    return {
        "character": _CHARACTER_SIMILARITY_THRESHOLD,
        "style": _STYLE_SIMILARITY_THRESHOLD,
    }[kind]
