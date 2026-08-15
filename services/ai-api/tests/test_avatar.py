"""Tests for the X5 avatar reconstruction endpoint and pipeline.

A large share of these assert *honesty* properties rather than functionality:
that no URL is emitted for an artifact that was not written, that no step is
marked completed unless it ran, and that procedural output is labelled as
such.
"""

from __future__ import annotations

import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

# Allow imports from the ai-api package tree.
_AI_API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_AI_API_ROOT))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.avatar import router
from src.services.avatar import engine as engine_mod
from src.services.avatar.gltf import read_glb
from src.services.avatar.reconstruction import read_splat_ply
from src.services.avatar_service import (
    IDENTITY_THRESHOLD,
    STATUS_COMPLETED,
    STATUS_SKIPPED,
    X5_PIPELINE_STEPS,
    create_avatar_job,
    pipeline_capability,
)

PHOTOS = ["https://example.com/front.jpg", "https://example.com/side.jpg"]


@pytest.fixture(autouse=True)
def isolated_storage(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Point artifact storage at a per-test directory."""
    monkeypatch.setenv("AVATAR_STORAGE_DIR", str(tmp_path))
    monkeypatch.delenv("AVATAR_STORAGE_BASE_URL", raising=False)
    monkeypatch.delenv("AVATAR_STORAGE_BACKEND", raising=False)
    monkeypatch.setenv("AVATAR_ENGINE", "mock")
    return tmp_path


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def _local_path(url: str) -> Path:
    """Resolve a file:// artifact URL back to a filesystem path."""
    assert url.startswith("file:///"), f"expected a file URL, got {url!r}"
    return Path(unquote(urlparse(url).path).lstrip("/"))


class TestGenerateAvatarEndpoint:
    """POST /ai/v1/generate/avatar"""

    def test_returns_201(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/avatar",
            json={"character_id": "char-001", "photos": PHOTOS},
        )
        assert resp.status_code == 201

    def test_returns_job_id(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/avatar",
            json={"character_id": "char-002", "photos": PHOTOS},
        )
        data = resp.json()
        assert isinstance(data["job_id"], str)
        assert len(data["job_id"]) > 0

    def test_declares_itself_a_mock(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/avatar",
            json={"character_id": "char-003", "photos": PHOTOS},
        )
        data = resp.json()
        assert data["is_mock"] is True
        assert data["engine"] == "mock"
        assert "procedural" in data["mock_notice"].lower()
        assert any("procedural" in w.lower() for w in data["warnings"])

    def test_does_not_emit_fabricated_cdn_urls(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/avatar",
            json={"character_id": "char-004", "photos": PHOTOS},
        )
        data = resp.json()
        for key in ("model_url", "rig_url", "splat_url", "eye_animation_url"):
            assert "cdn.animaforge.ai" not in data[key]

    def test_every_url_points_at_a_written_file(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/avatar",
            json={"character_id": "char-005", "photos": PHOTOS},
        )
        data = resp.json()
        for name, artifact in data["artifacts"].items():
            path = _local_path(artifact["url"])
            assert path.is_file(), f"{name} URL does not resolve to a file"
            assert path.stat().st_size == artifact["size_bytes"]

    def test_missing_character_id_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/avatar", json={"photos": PHOTOS}
        )
        assert resp.status_code == 422

    def test_missing_photos_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/avatar", json={"character_id": "char-err"}
        )
        assert resp.status_code == 422

    def test_empty_photos_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/avatar",
            json={"character_id": "char-err", "photos": []},
        )
        assert resp.status_code == 422

    def test_real_engine_without_gpu_returns_503(
        self, client: TestClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """AVATAR_ENGINE=real must fail loudly, never fall back to mock."""
        if engine_mod.real_engine_available():
            pytest.skip("host can run the real engine; nothing to assert here")

        monkeypatch.setenv("AVATAR_ENGINE", "real")
        resp = client.post(
            "/ai/v1/generate/avatar",
            json={"character_id": "char-real", "photos": PHOTOS},
        )
        assert resp.status_code == 503
        assert "missing" in resp.json()["detail"].lower()


class TestCapabilityEndpoint:
    """GET /ai/v1/avatar/capabilities"""

    def test_reports_true_availability(self, client: TestClient) -> None:
        data = client.get("/ai/v1/avatar/capabilities").json()

        assert data["real_engine_available"] is engine_mod.real_engine_available()
        assert data["torch_installed"] is engine_mod._module_installed("torch")
        assert data["gsplat_installed"] is engine_mod._module_installed("gsplat")
        assert data["identity_scoring_available"] is False
        assert data["flame_fitting_available"] is False

    def test_lists_what_is_missing(self, client: TestClient) -> None:
        data = client.get("/ai/v1/avatar/capabilities").json()
        if not data["real_engine_available"]:
            assert data["missing"], "an unavailable engine must say why"


class TestX5PipelineSteps:
    """Verify the X5 pipeline definition."""

    def test_seven_steps(self) -> None:
        assert len(X5_PIPELINE_STEPS) == 7

    def test_steps_have_name_and_description(self) -> None:
        for step in X5_PIPELINE_STEPS:
            assert "name" in step
            assert "description" in step

    def test_quality_validation_is_last(self) -> None:
        assert X5_PIPELINE_STEPS[-1]["name"] == "quality_validation"


class TestCreateAvatarJob:
    """Unit tests for create_avatar_job."""

    def test_returns_job_id(self) -> None:
        result = create_avatar_job("char-t1", PHOTOS)
        assert isinstance(result["job_id"], str)

    def test_reports_a_status_for_every_step(self) -> None:
        result = create_avatar_job("char-t2", PHOTOS)
        assert len(result["steps_completed"]) == 7
        for index, step in enumerate(result["steps_completed"], start=1):
            assert step["step"] == index
            assert step["status"] in {STATUS_COMPLETED, STATUS_SKIPPED, "failed"}

    def test_skipped_steps_carry_a_reason(self) -> None:
        result = create_avatar_job("char-t3", PHOTOS)
        skipped = [s for s in result["steps_completed"] if s["status"] == STATUS_SKIPPED]
        assert skipped, "FLAME fitting and identity scoring cannot run here"
        for step in skipped:
            assert step["reason"].strip()

    def test_flame_fitting_is_not_claimed(self) -> None:
        """FLAME needs licensed weights, so the step must not say completed."""
        result = create_avatar_job("char-t4", PHOTOS)
        flame = result["steps_completed"][4]
        assert flame["name"] == "flame_fitting"
        assert flame["status"] == STATUS_SKIPPED
        assert "licens" in flame["reason"].lower()

    def test_identity_score_is_not_fabricated(self) -> None:
        """The old mock asserted 0.95; nothing computes an identity score."""
        result = create_avatar_job("char-t5", PHOTOS)
        validation = result["steps_completed"][6]
        assert validation["name"] == "quality_validation"
        assert validation["status"] == STATUS_SKIPPED
        assert validation["metrics"]["identity_score"] is None
        assert validation["metrics"]["identity_check_ran"] is False
        assert validation["metrics"]["identity_threshold"] == IDENTITY_THRESHOLD

    def test_geometry_checks_actually_ran(self) -> None:
        result = create_avatar_job("char-t6", PHOTOS)
        metrics = result["steps_completed"][6]["metrics"]
        assert metrics["geometry_checks_ran"] is True
        assert metrics["vertices_finite"] is True
        assert metrics["indices_in_range"] is True
        assert metrics["degenerate_triangles"] == 0
        assert metrics["min_triangle_area_m2"] > 0.0
        # A closed two-manifold: every edge shared by exactly two triangles.
        assert metrics["non_manifold_edges"] == 0
        assert metrics["boundary_edges"] == 0
        assert metrics["closed_manifold"] is True

    def test_single_photo_skips_alignment(self) -> None:
        result = create_avatar_job("char-t7", ["only.jpg"])
        alignment = result["steps_completed"][0]
        assert alignment["status"] == STATUS_SKIPPED
        assert "single reference view" in alignment["reason"].lower()

    def test_two_photos_complete_alignment(self) -> None:
        result = create_avatar_job("char-t8", PHOTOS)
        alignment = result["steps_completed"][0]
        assert alignment["status"] == STATUS_COMPLETED
        assert alignment["metrics"]["view_count"] == 2

    def test_empty_photos_rejected(self) -> None:
        with pytest.raises(ValueError, match="(?i)at least one reference photo"):
            create_avatar_job("char-t9", [])

    def test_writes_a_readable_glb(self) -> None:
        result = create_avatar_job("char-t10", PHOTOS)
        blob = _local_path(result["model_url"]).read_bytes()

        gltf, binary = read_glb(blob)
        assert gltf["asset"]["version"] == "2.0"
        assert len(gltf["meshes"]) == 1
        assert len(binary) > 0

    def test_writes_a_readable_splat_ply(self) -> None:
        result = create_avatar_job("char-t11", PHOTOS)
        blob = _local_path(result["splat_url"]).read_bytes()

        count, properties = read_splat_ply(blob)
        assert count > 0
        # Standard 3DGS property names, so the file loads in splat viewers.
        for name in ("x", "y", "z", "opacity", "f_dc_0", "scale_0", "rot_0"):
            assert name in properties

    def test_is_deterministic_for_a_character(self) -> None:
        first = create_avatar_job("char-stable", PHOTOS)
        second = create_avatar_job("char-stable", PHOTOS)
        assert (
            first["artifacts"]["gltf"]["sha256"]
            == second["artifacts"]["gltf"]["sha256"]
        )

    def test_differs_between_characters(self) -> None:
        first = create_avatar_job("char-a", PHOTOS)
        second = create_avatar_job("char-b", PHOTOS)
        assert (
            first["artifacts"]["gltf"]["sha256"]
            != second["artifacts"]["gltf"]["sha256"]
        )

    def test_includes_all_four_subsystems(self) -> None:
        result = create_avatar_job("char-t12", PHOTOS, skin_tone="#8D5524")
        assert result["skin"]["melanin_fraction"] > 0
        assert result["body_params"]["estimated_stature_m"] > 0
        assert result["eye_statistics"]["saccade_count"] > 0
        assert "facs_rig" in result["artifacts"]


class TestRealEngine:
    """The real engine path — skipped explicitly, never silently."""

    def test_real_reconstruction(self, monkeypatch: pytest.MonkeyPatch) -> None:
        capability = engine_mod.probe()
        if not capability.real_engine_available:
            pytest.skip(
                "real 3DGS engine unavailable on this host; missing: "
                + ", ".join(capability.missing)
            )

        monkeypatch.setenv("AVATAR_ENGINE", "real")
        result = create_avatar_job("char-real", PHOTOS)
        assert result["engine"] == "real"
        assert result["is_mock"] is False
        assert result["mock_notice"] is None


class TestPipelineCapability:
    def test_never_claims_unavailable_features(self) -> None:
        capability = pipeline_capability()
        assert capability["identity_scoring_available"] is False
        assert capability["flame_fitting_available"] is False
        if capability["active_engine"] == "mock":
            assert capability["mock_notice"]
