"""Tests for script generation and QC validation endpoints."""

from __future__ import annotations

import sys
from pathlib import Path

# Allow imports from the ai-api package tree.
_AI_API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_AI_API_ROOT))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.script import router
from src.services.qc_service import validate_output
from src.services.script_service import generate_script


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


class TestScriptGenerateEndpoint:
    """POST /ai/v1/script/generate"""

    def test_returns_201(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/script/generate",
            json={"project_id": "proj-001", "scene_desc": "A tense standoff at dawn"},
        )
        assert resp.status_code == 201

    def test_response_contains_script(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/script/generate",
            json={"project_id": "proj-002", "scene_desc": "Forest chase scene"},
        )
        data = resp.json()
        assert "script" in data
        assert isinstance(data["script"], str)
        assert len(data["script"]) > 0

    def test_response_contains_shot_breakdown(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/script/generate",
            json={"project_id": "proj-003", "scene_desc": "Quiet dialogue"},
        )
        data = resp.json()
        assert "shot_breakdown" in data
        assert isinstance(data["shot_breakdown"], list)
        assert len(data["shot_breakdown"]) > 0
        shot = data["shot_breakdown"][0]
        assert "shot_number" in shot
        assert "description" in shot
        assert "duration_ms" in shot
        assert "camera" in shot

    def test_response_contains_scene_graphs(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/script/generate",
            json={"project_id": "proj-004", "scene_desc": "Battle sequence"},
        )
        data = resp.json()
        assert "scene_graphs" in data
        assert isinstance(data["scene_graphs"], list)
        assert len(data["scene_graphs"]) > 0
        graph = data["scene_graphs"][0]
        assert "subject" in graph
        assert "camera" in graph
        assert "action" in graph
        assert "emotion" in graph
        assert "timing" in graph

    def test_char_ids_propagated(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/script/generate",
            json={
                "project_id": "proj-005",
                "scene_desc": "Two friends meet",
                "char_ids": ["alice", "bob"],
            },
        )
        data = resp.json()
        assert "alice" in data["script"].lower() or "alice" in str(data["scene_graphs"]).lower()

    def test_missing_scene_desc_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/script/generate",
            json={"project_id": "proj-err"},
        )
        assert resp.status_code == 422


class TestQCValidateEndpoint:
    """POST /ai/v1/qc/validate"""

    def test_returns_200(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/qc/validate",
            json={
                "output_url": "https://cdn.animaforge.ai/output/test.mp4",
                "checks": ["flicker", "identity"],
            },
        )
        assert resp.status_code == 200

    def test_response_structure(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/qc/validate",
            json={
                "output_url": "https://cdn.animaforge.ai/output/test.mp4",
                "checks": ["flicker", "identity", "loudness", "artifacts"],
            },
        )
        data = resp.json()
        assert "report" in data
        assert "passed" in data
        assert "issues" in data
        assert isinstance(data["passed"], bool)
        assert isinstance(data["issues"], list)

    def test_all_checks_pass(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/qc/validate",
            json={
                "output_url": "https://cdn.animaforge.ai/output/test.mp4",
                "checks": ["flicker", "identity", "loudness", "artifacts"],
            },
        )
        data = resp.json()
        assert data["passed"] is True
        assert data["report"]["overall_pass"] is True

    def test_no_recognised_checks(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/qc/validate",
            json={
                "output_url": "https://cdn.animaforge.ai/output/test.mp4",
                "checks": ["nonexistent"],
            },
        )
        data = resp.json()
        assert data["passed"] is False
        assert len(data["issues"]) > 0


class TestGenerateScriptService:
    """Unit tests for generate_script."""

    def test_returns_script_text(self) -> None:
        result = generate_script("p1", "A quiet room")
        assert "script" in result
        assert isinstance(result["script"], str)

    def test_returns_shot_breakdown(self) -> None:
        result = generate_script("p1", "A quiet room")
        assert len(result["shot_breakdown"]) == 3
        for shot in result["shot_breakdown"]:
            assert shot["duration_ms"] > 0

    def test_returns_scene_graphs(self) -> None:
        result = generate_script("p1", "A quiet room", char_ids=["hero"])
        assert len(result["scene_graphs"]) == 2
        assert result["scene_graphs"][0]["subject"] == "hero"

    def test_default_character(self) -> None:
        result = generate_script("p1", "test")
        assert result["scene_graphs"][0]["subject"] == "char-default"


class TestValidateOutputService:
    """Unit tests for validate_output."""

    def test_all_checks(self) -> None:
        result = validate_output(
            "http://example.com/test.mp4",
            ["flicker", "identity", "loudness", "artifacts"],
        )
        assert result["passed"] is True
        assert "flicker_score" in result["report"]
        assert "identity_drift" in result["report"]
        assert "loudness_lufs" in result["report"]
        assert "artifact_count" in result["report"]

    def test_no_recognised_checks_fails(self) -> None:
        result = validate_output("http://example.com/test.mp4", ["bogus"])
        assert result["passed"] is False
