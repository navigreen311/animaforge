"""Tests for motion capture input (E8) -- service layer and route endpoints."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.mocap import router
from src.services.mocap_service import (
    SUPPORTED_FORMATS,
    blend_motions,
    motion_to_keyframes,
    parse_bvh,
    parse_fbx_motion,
    retarget_motion,
    validate_motion_data,
)

# ── App fixture ──────────────────────────────────────────────────────────────


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


# ── Service-layer unit tests ────────────────────────────────────────────────


class TestMocapService:
    def test_parse_bvh_returns_motion_data(self) -> None:
        result = parse_bvh("https://example.com/walk.bvh")
        assert result["format"] == "bvh"
        assert result["motion_id"].startswith("mocap-")
        assert result["joint_count"] == 19
        assert result["frame_count"] == 120
        assert result["fps"] == 30.0
        assert result["duration_ms"] == 4000
        assert len(result["joints"]) == 19
        assert len(result["keyframes"]) == 120

    def test_parse_bvh_rejects_wrong_extension(self) -> None:
        with pytest.raises(ValueError, match="Expected .bvh file"):
            parse_bvh("https://example.com/walk.fbx")

    def test_retarget_motion_maps_joints(self) -> None:
        motion = parse_bvh("https://example.com/run.bvh")
        result = retarget_motion(motion, "char-42")
        assert 0 < result["compatibility_score"] <= 1.0
        assert result["retargeted_motion"]["target_character_id"] == "char-42"
        assert isinstance(result["unmapped_joints"], list)

    def test_blend_motions_interpolates(self) -> None:
        motion_a = parse_bvh("https://example.com/walk.bvh")
        motion_b = parse_bvh("https://example.com/run.bvh")
        blended = blend_motions(motion_a, motion_b, 0.5)
        assert blended["format"] == "blended"
        assert blended["blend_factor"] == 0.5
        assert blended["frame_count"] > 0
        assert len(blended["keyframes"]) == blended["frame_count"]

    def test_validate_motion_data_valid(self) -> None:
        motion = parse_bvh("https://example.com/walk.bvh")
        result = validate_motion_data(motion)
        assert result["valid"] is True
        assert result["errors"] == []

    def test_validate_motion_data_catches_errors(self) -> None:
        bad_data = {"fps": 0, "duration_ms": -1, "joints": []}
        result = validate_motion_data(bad_data)
        assert result["valid"] is False
        assert len(result["errors"]) >= 2


# ── Route / integration tests ───────────────────────────────────────────────


class TestMocapEndpoints:
    def test_upload_and_apply_workflow(self, client: TestClient) -> None:
        # Upload
        resp = client.post(
            "/ai/v1/mocap/upload",
            json={"file_url": "https://example.com/walk.bvh", "format": "bvh"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "motion_id" in data
        assert data["format"] == "bvh"
        assert data["stats"]["joint_count"] == 19

        motion_id = data["motion_id"]

        # Apply to shot
        resp = client.post(
            "/ai/v1/mocap/apply",
            json={"motion_id": motion_id, "shot_id": "shot-99"},
        )
        assert resp.status_code == 200
        apply_data = resp.json()
        assert apply_data["shot_id"] == "shot-99"
        assert apply_data["keyframe_count"] > 0

    def test_list_supported_formats(self, client: TestClient) -> None:
        resp = client.get("/ai/v1/mocap/formats")
        assert resp.status_code == 200
        data = resp.json()
        assert set(data["formats"]) == {"bvh", "fbx", "c3d", "trc"}
