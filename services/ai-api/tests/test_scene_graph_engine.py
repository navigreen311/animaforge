"""Tests for 3D scene graph spatial reasoning engine (E3b)."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.scene_graph import router
from src.services.scene_graph_engine import (
    compute_camera_frustum,
    compute_lighting,
    compute_spatial_layout,
    detect_occlusions,
    generate_depth_map,
    interpolate_between_shots,
    parse_scene_graph,
    suggest_camera_placement,
    validate_composition,
)

# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


@pytest.fixture()
def basic_scene_graph() -> dict:
    return {
        "elements": [
            {"id": "cam-1", "type": "camera", "position": {"x": 0, "y": 1.5, "z": 10}},
            {"id": "char-1", "type": "character", "position": {"x": -1, "y": 0.9, "z": 0}},
            {"id": "char-2", "type": "character", "position": {"x": 1, "y": 0.9, "z": 0}},
            {"id": "table", "type": "prop", "position": {"x": 0, "y": 0.4, "z": 0}},
        ],
    }


# ── Service-layer unit tests ────────────────────────────────────────────────


class TestSceneGraphEngine:
    def test_parse_scene_graph_normalises_elements(self, basic_scene_graph: dict) -> None:
        result = parse_scene_graph(basic_scene_graph)
        assert len(result["elements"]) == 4
        for elem in result["elements"]:
            assert "id" in elem
            assert "type" in elem
            assert "position" in elem
            assert "rotation" in elem
            assert "scale" in elem

    def test_parse_scene_graph_rejects_missing_elements(self) -> None:
        with pytest.raises(ValueError, match="must contain 'elements'"):
            parse_scene_graph({"metadata": {}})

    def test_compute_spatial_layout_returns_bounds(self, basic_scene_graph: dict) -> None:
        layout = compute_spatial_layout(basic_scene_graph)
        assert "elements" in layout
        assert len(layout["elements"]) == 4
        for elem in layout["elements"]:
            assert "bounds" in elem
            assert "min" in elem["bounds"]
            assert "max" in elem["bounds"]
            # max > min on all axes
            for axis in ("x", "y", "z"):
                assert elem["bounds"]["max"][axis] >= elem["bounds"]["min"][axis]

    def test_detect_occlusions_finds_blocking(self) -> None:
        """Two characters at same XY but different Z: closer one blocks farther."""
        scene = {
            "elements": [
                {"id": "cam", "type": "camera", "position": {"x": 0, "y": 1.5, "z": 10}},
                {"id": "front", "type": "character", "position": {"x": 0, "y": 0.9, "z": 5}},
                {"id": "back", "type": "character", "position": {"x": 0, "y": 0.9, "z": 0}},
            ],
        }
        layout = compute_spatial_layout(scene)
        result = detect_occlusions(layout)
        assert len(result["occlusions"]) > 0
        blocked_ids = [o["blocked_element"] for o in result["occlusions"]]
        assert "back" in blocked_ids

    def test_compute_camera_frustum_values(self) -> None:
        spec = {"focal_length": 50, "sensor_width": 36, "near": 0.1, "far": 100}
        frustum = compute_camera_frustum(spec)
        assert frustum["near"] == 0.1
        assert frustum["far"] == 100
        assert 30 < frustum["fov"] < 50  # 50mm on 36mm sensor ~39.6 deg
        assert len(frustum["frustum_corners"]) == 8

    def test_validate_composition_returns_score(self, basic_scene_graph: dict) -> None:
        layout = compute_spatial_layout(basic_scene_graph)
        frustum = compute_camera_frustum({"focal_length": 35})
        result = validate_composition(layout, frustum)
        assert 0.0 <= result["score"] <= 1.0
        assert isinstance(result["violations"], list)
        assert isinstance(result["suggestions"], list)

    def test_generate_depth_map_orders_by_distance(self, basic_scene_graph: dict) -> None:
        layout = compute_spatial_layout(basic_scene_graph)
        camera = {"position": {"x": 0, "y": 1.5, "z": 10}}
        dm = generate_depth_map(layout, camera)
        assert len(dm["elements"]) > 0
        # Layers should be ascending
        layers = [e["layer"] for e in dm["elements"]]
        assert layers == sorted(layers)
        # Depths should be ascending
        depths = [e["depth"] for e in dm["elements"]]
        assert depths == sorted(depths)

    def test_interpolate_between_shots_midpoint(self) -> None:
        sg_a = {"elements": [{"id": "c1", "type": "character", "position": {"x": 0, "y": 0, "z": 0}}]}
        sg_b = {"elements": [{"id": "c1", "type": "character", "position": {"x": 10, "y": 0, "z": 0}}]}
        result = interpolate_between_shots(sg_a, sg_b, 0.5)
        assert result["t"] == 0.5
        elem = result["elements"][0]
        assert abs(elem["position"]["x"] - 5.0) < 0.01

    def test_suggest_camera_placement_returns_suggestions(self, basic_scene_graph: dict) -> None:
        for style in ("cinematic", "documentary", "anime"):
            result = suggest_camera_placement(basic_scene_graph, style)
            assert len(result["suggestions"]) > 0
            for s in result["suggestions"]:
                assert "position" in s
                assert "rotation" in s
                assert "focal_length" in s
                assert "rationale" in s

    def test_compute_lighting_three_point(self, basic_scene_graph: dict) -> None:
        result = compute_lighting(basic_scene_graph)
        assert "key_light" in result
        assert "fill_light" in result
        assert "back_light" in result
        assert "ambient" in result
        assert result["key_light"]["intensity"] > result["fill_light"]["intensity"]
        assert result["ambient"]["intensity"] < result["fill_light"]["intensity"]


# ── Route integration test ──────────────────────────────────────────────────


class TestSceneGraphRoutes:
    def test_layout_endpoint(self, client: TestClient, basic_scene_graph: dict) -> None:
        resp = client.post("/ai/v1/scene-graph/layout", json={"scene_graph": basic_scene_graph})
        assert resp.status_code == 200
        data = resp.json()
        assert "elements" in data
        assert len(data["elements"]) == 4
