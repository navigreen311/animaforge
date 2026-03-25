"""Integration tests for Claude API script generation with mock fallback."""

from __future__ import annotations

import json
import sys
from pathlib import Path

_AI_API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_AI_API_ROOT))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.script import router
from src.services.script_service import (
    generate_mock_script,
    parse_script_response,
)


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


# -- Mock fallback tests -------------------------------------------------------


class TestMockFallback:
    """Verify generate_mock_script returns valid structured data."""

    def test_returns_script_text(self) -> None:
        result = generate_mock_script("A dark alley at night")
        assert "script" in result
        assert isinstance(result["script"], str)
        assert "A dark alley at night" in result["script"]

    def test_returns_shot_breakdown_with_camera_dicts(self) -> None:
        result = generate_mock_script("A dark alley at night")
        assert len(result["shot_breakdown"]) == 4
        for shot in result["shot_breakdown"]:
            assert "shot_number" in shot
            assert "description" in shot
            assert "duration_ms" in shot
            assert isinstance(shot["camera"], dict)
            assert "angle" in shot["camera"]
            assert "movement" in shot["camera"]

    def test_shot_durations_in_range(self) -> None:
        result = generate_mock_script("Action scene")
        for shot in result["shot_breakdown"]:
            assert 1000 <= shot["duration_ms"] <= 10000

    def test_returns_scene_graphs(self) -> None:
        result = generate_mock_script("Chase through the city")
        assert len(result["scene_graphs"]) == 4
        for graph in result["scene_graphs"]:
            assert "subject" in graph
            assert "camera" in graph
            assert "action" in graph
            assert "emotion" in graph
            assert "timing" in graph
            assert "dialogue" in graph or graph.get("dialogue") is None

    def test_char_ids_not_used_in_mock(self) -> None:
        """Mock ignores char_ids; it always uses generic characters."""
        result = generate_mock_script("A scene", char_ids=["hero", "villain"])
        assert isinstance(result["script"], str)


# -- Response parsing tests ----------------------------------------------------


class TestParseScriptResponse:
    """Verify parse_script_response handles various Claude output formats."""

    def test_parses_raw_json(self) -> None:
        raw = json.dumps({
            "script": "Hello world",
            "shot_breakdown": [],
            "scene_graphs": [],
        })
        result = parse_script_response(raw, "test")
        assert result["script"] == "Hello world"

    def test_parses_json_in_code_block(self) -> None:
        content = (
            '```json\n{"script": "From code block",'
            ' "shot_breakdown": [], "scene_graphs": []}\n```'
        )
        result = parse_script_response(content, "test")
        assert result["script"] == "From code block"

    def test_falls_back_to_plain_text(self) -> None:
        content = "This is just plain text, not JSON at all."
        result = parse_script_response(content, "test")
        assert result["script"] == content
        assert result["shot_breakdown"] == []
        assert result["scene_graphs"] == []

    def test_handles_nested_json(self) -> None:
        data = {
            "script": "Nested test",
            "shot_breakdown": [
                {
                    "shot_number": 1,
                    "description": "Wide",
                    "duration_ms": 3000,
                    "camera": {"angle": "wide", "movement": "static"},
                }
            ],
            "scene_graphs": [
                {
                    "subject": "hero",
                    "camera": {"angle": "wide", "movement": "static"},
                    "action": "enter",
                    "emotion": "calm",
                    "timing": {"duration_ms": 3000, "pacing": "slow"},
                    "dialogue": None,
                }
            ],
        }
        result = parse_script_response(json.dumps(data), "test")
        assert len(result["shot_breakdown"]) == 1
        assert result["shot_breakdown"][0]["camera"]["angle"] == "wide"


# -- Endpoint integration tests (uses mock fallback, no API key) ---------------


class TestEndpointWithMockFallback:
    """Test the /script/generate endpoint falls back to mock when no API key."""

    def test_returns_201(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/script/generate",
            json={
                "project_id": "proj-int-1",
                "scene_desc": "A sunrise over mountains",
            },
        )
        assert resp.status_code == 201

    def test_response_has_structured_camera(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/script/generate",
            json={
                "project_id": "proj-int-2",
                "scene_desc": "Two robots talking",
            },
        )
        data = resp.json()
        assert len(data["shot_breakdown"]) > 0
        shot = data["shot_breakdown"][0]
        assert isinstance(shot["camera"], dict)
        assert "angle" in shot["camera"]
        assert "movement" in shot["camera"]

    def test_response_scene_graphs_valid(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/script/generate",
            json={
                "project_id": "proj-int-3",
                "scene_desc": "Explosion in space",
            },
        )
        data = resp.json()
        assert len(data["scene_graphs"]) > 0
        for graph in data["scene_graphs"]:
            assert "subject" in graph
            assert "timing" in graph
            assert "duration_ms" in graph["timing"]
