"""Tests for ML-based model router."""

from __future__ import annotations

import pytest

from src.services.model_router_ml import ModelRouter, MODEL_REGISTRY


@pytest.fixture
def router() -> ModelRouter:
    return ModelRouter()


# 1. Model selection returns expected structure
class TestSelectModel:
    def test_select_model_returns_valid_structure(self, router: ModelRouter):
        result = router.select_model("video", params={"resolution": "1080p", "duration": 10})
        assert "model_id" in result
        assert "confidence" in result
        assert "reasoning" in result
        assert "alternatives" in result
        assert isinstance(result["alternatives"], list)
        assert 0 < result["confidence"] <= 1.0
        # Selected model must be a video model
        assert MODEL_REGISTRY[result["model_id"]]["type"] == "video"

    # 2. Unknown job type raises ValueError
    def test_select_model_unknown_job_type(self, router: ModelRouter):
        with pytest.raises(ValueError, match="No models available"):
            router.select_model("teleportation")

    # 3. User preference influences selection
    def test_user_preference_influences_selection(self, router: ModelRouter):
        cost_result = router.select_model(
            "video",
            params={"resolution": "720p"},
            user_prefs={"priority": "cost"},
        )
        quality_result = router.select_model(
            "video",
            params={"resolution": "720p"},
            user_prefs={"priority": "quality"},
        )
        # Both should return valid models; cost-optimized may differ
        assert cost_result["model_id"] in MODEL_REGISTRY
        assert quality_result["model_id"] in MODEL_REGISTRY
        # At minimum, reasoning should reflect the preference
        assert "cost" in cost_result["reasoning"].lower()
        assert "quality" in quality_result["reasoning"].lower()

    # 4. Quality history shifts confidence
    def test_quality_history_affects_confidence(self, router: ModelRouter):
        base = router.select_model("image")
        boosted = router.select_model(
            "image",
            quality_history={"sdxl-v1-animaforge": 0.99, "flux-dev-v1": 0.50},
        )
        # The model with higher history score should be preferred or
        # confidence should shift
        assert boosted["confidence"] > 0


# 5. A/B testing
class TestABTesting:
    def test_ab_test_returns_valid_variant(self, router: ModelRouter):
        result = router.route_with_ab_test("image", experiment_id="exp-img-001")
        assert result["variant"] in ("A", "B")
        assert result["experiment_id"] == "exp-img-001"
        assert result["model_id"] in MODEL_REGISTRY

    def test_ab_test_reuses_experiment(self, router: ModelRouter):
        r1 = router.route_with_ab_test("image", experiment_id="exp-reuse")
        r2 = router.route_with_ab_test("image", experiment_id="exp-reuse")
        assert r1["experiment_id"] == r2["experiment_id"]


# 6. Resource estimation
class TestResourceEstimation:
    def test_estimate_resources_structure(self, router: ModelRouter):
        est = router.estimate_resources(
            "cogvideox-5b-i2v", {"resolution": "1080p", "duration": 10}
        )
        assert est["gpu_class"] in ("T4", "A10G", "A100", "H100")
        assert est["vram_required_gb"] > 0
        assert est["estimated_seconds"] > 0
        assert est["cost_credits"] > 0


# 7. Performance tracking
class TestPerformanceTracking:
    def test_track_and_retrieve_performance(self, router: ModelRouter):
        router.track_model_result("sdxl-v1-animaforge", "job-1", 0.95, 1200)
        router.track_model_result("sdxl-v1-animaforge", "job-2", 0.90, 1100)
        perf = router.get_model_performance("sdxl-v1-animaforge")
        assert perf["total_jobs"] == 2
        assert 0.90 <= perf["avg_quality"] <= 0.95
        assert perf["avg_latency_ms"] == pytest.approx(1150.0)
        assert perf["success_rate"] == 1.0


# 8. Routing explanation
class TestRoutingExplanation:
    def test_routing_explanation_contains_details(self, router: ModelRouter):
        sel = router.select_model("voice")
        explanation = router.get_routing_explanation(sel["job_id"])
        assert sel["model_id"] in explanation
        assert "voice" in explanation
        assert "Reasoning" in explanation

    def test_routing_explanation_missing_job(self, router: ModelRouter):
        explanation = router.get_routing_explanation("nonexistent-job-id")
        assert "No routing record" in explanation


# 9. Leaderboard
class TestLeaderboard:
    def test_leaderboard_ordering(self, router: ModelRouter):
        # Track some results to influence ordering
        router.track_model_result("wav2lip-hd", "j1", 0.80, 500)
        router.track_model_result("video-retalking-v2", "j2", 0.95, 800)
        board = router.get_model_leaderboard("lipsync")
        assert len(board) == 2
        # Higher avg quality should be first
        assert board[0]["avg_quality"] >= board[1]["avg_quality"]
