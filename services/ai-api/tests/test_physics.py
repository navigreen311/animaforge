"""Tests for PBD physics simulation (F5) -- service layer and route endpoints."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.physics import router
from src.services.physics_service import (
    PBD_CONFIG,
    apply_wind,
    get_material_presets,
    simulate_cloth,
    simulate_hair,
    simulate_rigid_body,
    simulate_soft_body,
    validate_physics_params,
)

# ── App fixture ──────────────────────────────────────────────────────────────


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


# ── Service-layer unit tests ────────────────────────────────────────────────


class TestPhysicsService:
    def test_simulate_cloth_returns_frames_and_stability(self) -> None:
        result = simulate_cloth(
            character_id="char-01",
            garment_params={"material": "silk", "vertex_count": 1024},
            motion_data={"duration_ms": 1000},
            fps=30,
        )
        assert result["job_id"].startswith("phys-")
        assert result["character_id"] == "char-01"
        assert result["material"] == "silk"
        assert result["frame_count"] == 30
        assert len(result["frames"]) == 30
        assert result["collision_count"] >= 0
        assert 0 <= result["stability_score"] <= 1.0
        # Each frame has expected keys
        frame = result["frames"][0]
        assert "com" in frame
        assert "vertex_count" in frame
        assert frame["vertex_count"] == 1024

    def test_simulate_hair_with_wind(self) -> None:
        result = simulate_hair(
            character_id="char-02",
            hair_params={"strand_count": 3000, "particles_per_strand": 8, "fps": 30},
            motion_data={"duration_ms": 1000},
            wind_params={"direction": [1, 0, 0], "strength": 10.0},
        )
        assert result["job_id"].startswith("phys-")
        assert result["strand_count"] == 3000
        assert result["particles_per_strand"] == 8
        assert result["frame_count"] == 30
        assert len(result["frames"]) == 30
        assert 0 <= result["flicker_score"] <= 1.0
        # Wind should cause tip displacement
        first_tip = result["frames"][0]["tip_position"]
        last_tip = result["frames"][-1]["tip_position"]
        assert first_tip != last_tip  # motion occurred

    def test_simulate_rigid_body_collision(self) -> None:
        objects = [
            {"id": "box-1", "position": [0, 5, 0], "velocity": [0, 0, 0], "mass": 2.0, "radius": 0.5},
            {"id": "box-2", "position": [0, 0.5, 0], "velocity": [0, 0, 0], "mass": 5.0, "radius": 0.5},
        ]
        result = simulate_rigid_body(objects, forces=[], duration_ms=2000)
        assert result["frame_count"] == 120
        assert len(result["frames"]) == 120
        assert len(result["objects_final_state"]) == 2
        # Object 1 should have fallen (gravity)
        final_box1 = next(o for o in result["objects_final_state"] if o["id"] == "box-1")
        assert "position" in final_box1
        assert "velocity" in final_box1

    def test_apply_wind_computes_force_vector(self) -> None:
        result = apply_wind(
            scene_id="scene-10",
            wind_direction=[1, 0, 0],
            wind_strength=20.0,
            turbulence=0.5,
        )
        assert result["scene_id"] == "scene-10"
        assert result["wind_strength"] == 20.0
        assert result["turbulence"] == 0.5
        assert result["noise_amplitude"] == round(0.5 * 20.0 * 0.3, 4)
        assert result["force_vector"] == [20.0, 0.0, 0.0]

    def test_get_material_presets_contains_all_fabrics(self) -> None:
        presets = get_material_presets()
        expected = {"cotton", "silk", "leather", "denim", "wool"}
        assert set(presets.keys()) == expected
        for name, props in presets.items():
            assert "stiffness" in props
            assert "damping" in props
            assert "mass_per_m2" in props
            assert 0 < props["stiffness"] <= 1.0

    def test_validate_physics_params_valid(self) -> None:
        result = validate_physics_params({
            "timestep": 0.01,
            "iterations": 4,
            "substeps": 10,
            "damping": 0.99,
            "gravity": [0, -9.81, 0],
        })
        assert result["valid"] is True
        assert result["errors"] == []

    def test_validate_physics_params_catches_errors(self) -> None:
        result = validate_physics_params({
            "timestep": -1,
            "iterations": 0,
            "damping": 5.0,
            "gravity": [0, -9.81],
        })
        assert result["valid"] is False
        assert len(result["errors"]) == 4

    def test_stability_scoring_decreases_with_motion(self) -> None:
        # Short calm sim → high stability
        calm = simulate_cloth(
            character_id="char-s1",
            garment_params={"material": "leather"},
            motion_data={"duration_ms": 500},
            fps=30,
        )
        # Longer sim → more gravity → lower stability
        active = simulate_cloth(
            character_id="char-s2",
            garment_params={"material": "silk"},
            motion_data={"duration_ms": 5000},
            fps=60,
        )
        # Both should be valid scores
        assert 0 <= calm["stability_score"] <= 1.0
        assert 0 <= active["stability_score"] <= 1.0


# ── Route / integration tests ───────────────────────────────────────────────


class TestPhysicsRoutes:
    def test_post_cloth_simulation(self, client: TestClient) -> None:
        resp = client.post("/ai/v1/physics/cloth", json={
            "character_id": "char-route-1",
            "garment_params": {"material": "denim"},
            "motion_data": {"duration_ms": 1000},
            "fps": 30,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["character_id"] == "char-route-1"
        assert data["material"] == "denim"
        assert data["frame_count"] == 30

    def test_post_hair_simulation(self, client: TestClient) -> None:
        resp = client.post("/ai/v1/physics/hair", json={
            "character_id": "char-route-2",
            "hair_params": {"strand_count": 2000},
            "motion_data": {"duration_ms": 500},
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["strand_count"] == 2000

    def test_post_rigid_body(self, client: TestClient) -> None:
        resp = client.post("/ai/v1/physics/rigid", json={
            "objects": [{"id": "obj-1", "position": [0, 3, 0]}],
            "forces": [],
            "duration_ms": 1000,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["objects_final_state"]) == 1

    def test_post_wind(self, client: TestClient) -> None:
        resp = client.post("/ai/v1/physics/wind", json={
            "scene_id": "scene-99",
            "wind_direction": [0, 0, 1],
            "wind_strength": 15.0,
            "turbulence": 0.3,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["scene_id"] == "scene-99"
        assert data["force_vector"][2] == 15.0

    def test_get_material_presets_route(self, client: TestClient) -> None:
        resp = client.get("/ai/v1/physics/materials")
        assert resp.status_code == 200
        data = resp.json()
        assert "cotton" in data["presets"]
        assert "silk" in data["presets"]

    def test_post_soft_body(self, client: TestClient) -> None:
        resp = client.post("/ai/v1/physics/soft", json={
            "mesh_url": "https://cdn.example.com/blob.obj",
            "force_params": {"direction": [0, -1, 0], "magnitude": 20.0},
            "material": {"stiffness": 0.7, "damping": 0.95},
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["job_id"].startswith("phys-")
        assert "deformed" in data["deformed_mesh_url"]
