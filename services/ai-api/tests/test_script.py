"""Tests for script generation and QC validation endpoints."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

_AI_API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_AI_API_ROOT))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.script import router
from src.services.qc_service import validate_output
from src.services.script_service import generate_mock_script, generate_script


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


class TestScriptGenerateEndpoint:

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

    def test_char_ids_accepted(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/script/generate",
            json={
                "project_id": "proj-005",
                "scene_desc": "Two friends meet",
                "char_ids": ["alice", "bob"],
            },
        )
        assert resp.status_code == 201

    def test_missing_scene_desc_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/script/generate",
            json={"project_id": "proj-err"},
        )
        assert resp.status_code == 422


class TestQCValidateEndpoint:

    def test_returns_200(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/qc/validate",
            json={
                "output_url": "https://cdn.animaforge.ai/output/test.mp4",
                "checks": ["flicker", "identity"],
            },
        )
        assert resp.status_code == 200

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


class TestGenerateScriptService:

    def _run(self, coro):
        return asyncio.get_event_loop().run_until_complete(coro)

    def test_returns_script_text(self) -> None:
        result = self._run(generate_script("p1", "A quiet room"))
        assert "script" in result
        assert isinstance(result["script"], str)

    def test_returns_shot_breakdown(self) -> None:
        result = self._run(generate_script("p1", "A quiet room"))
        assert len(result["shot_breakdown"]) == 4

    def test_returns_scene_graphs(self) -> None:
        result = self._run(generate_script("p1", "A quiet room", char_ids=["hero"]))
        assert len(result["scene_graphs"]) == 4

    def test_mock_fallback_without_api_key(self) -> None:
        result = self._run(generate_script("p1", "test"))
        assert "script" in result
        assert len(result["shot_breakdown"]) > 0


class TestGenerateMockScript:

    def test_returns_script_text(self) -> None:
        result = generate_mock_script("A quiet room")
        assert "script" in result

    def test_returns_four_shots(self) -> None:
        result = generate_mock_script("A quiet room")
        assert len(result["shot_breakdown"]) == 4

    def test_camera_is_dict(self) -> None:
        result = generate_mock_script("test")
        for shot in result["shot_breakdown"]:
            assert isinstance(shot["camera"], dict)
            assert "angle" in shot["camera"]
            assert "movement" in shot["camera"]


class TestValidateOutputService:

    def test_all_checks(self) -> None:
        result = validate_output(
            "http://example.com/test.mp4",
            ["flicker", "identity", "loudness", "artifacts"],
        )
        assert result["passed"] is True

    def test_no_recognised_checks_fails(self) -> None:
        result = validate_output("http://example.com/test.mp4", ["bogus"])
        assert result["passed"] is False
