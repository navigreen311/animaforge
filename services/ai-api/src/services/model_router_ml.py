"""ML-based model router with intelligent selection, A/B testing,
performance tracking, and resource estimation for AnimaForge pipelines."""

from __future__ import annotations

import random
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

# ---------------------------------------------------------------------------
# Model Registry
# ---------------------------------------------------------------------------

MODEL_REGISTRY: dict[str, dict[str, Any]] = {
    # Video
    "cogvideox-5b-i2v": {
        "type": "video",
        "max_resolution": "1080p",
        "max_duration": 30,
        "gpu": "A100",
        "quality": 0.92,
        "vram_gb": 40,
        "cost_per_sec": 0.08,
    },
    "animatediff-lightning-4step": {
        "type": "video",
        "max_resolution": "720p",
        "max_duration": 10,
        "gpu": "A10G",
        "quality": 0.85,
        "vram_gb": 16,
        "cost_per_sec": 0.03,
    },
    # Image
    "sdxl-v1-animaforge": {
        "type": "image",
        "max_resolution": "4K",
        "gpu": "A10G",
        "quality": 0.95,
        "vram_gb": 16,
        "cost_per_sec": 0.02,
    },
    "flux-dev-v1": {
        "type": "image",
        "max_resolution": "4K",
        "gpu": "A100",
        "quality": 0.97,
        "vram_gb": 24,
        "cost_per_sec": 0.05,
    },
    # Motion
    "animatediff-motion-v3": {
        "type": "motion",
        "max_resolution": "720p",
        "max_duration": 15,
        "gpu": "T4",
        "quality": 0.88,
        "vram_gb": 12,
        "cost_per_sec": 0.015,
    },
    "motion-ctrl-svd": {
        "type": "motion",
        "max_resolution": "1080p",
        "max_duration": 20,
        "gpu": "A10G",
        "quality": 0.91,
        "vram_gb": 16,
        "cost_per_sec": 0.04,
    },
    # Lipsync
    "wav2lip-hd": {
        "type": "lipsync",
        "max_resolution": "1080p",
        "gpu": "T4",
        "quality": 0.90,
        "vram_gb": 8,
        "cost_per_sec": 0.01,
    },
    "video-retalking-v2": {
        "type": "lipsync",
        "max_resolution": "1080p",
        "gpu": "A10G",
        "quality": 0.93,
        "vram_gb": 14,
        "cost_per_sec": 0.03,
    },
    # Voice
    "elevenlabs-v2": {
        "type": "voice",
        "gpu": "none",
        "quality": 0.96,
        "vram_gb": 0,
        "cost_per_sec": 0.006,
    },
    "xtts-v2-local": {
        "type": "voice",
        "gpu": "T4",
        "quality": 0.89,
        "vram_gb": 6,
        "cost_per_sec": 0.008,
    },
    # Style
    "clip-style-encoder-v2": {
        "type": "style",
        "gpu": "A10G",
        "quality": 0.91,
        "vram_gb": 10,
        "cost_per_sec": 0.012,
    },
    "ip-adapter-style-v2": {
        "type": "style",
        "gpu": "A10G",
        "quality": 0.93,
        "vram_gb": 14,
        "cost_per_sec": 0.025,
    },
}

# Resolution ordering for comparison
_RESOLUTION_RANK = {"480p": 1, "720p": 2, "1080p": 3, "2K": 4, "4K": 5}

# GPU class ordering
_GPU_RANK = {"none": 0, "T4": 1, "A10G": 2, "A100": 3, "H100": 4}


@dataclass
class _ModelStats:
    total_jobs: int = 0
    total_quality: float = 0.0
    total_latency_ms: float = 0.0
    successes: int = 0
    failures: int = 0
    gpu_seconds: float = 0.0


@dataclass
class _ABExperiment:
    experiment_id: str
    model_a: str
    model_b: str
    assignments: dict[str, str] = field(default_factory=dict)


class ModelRouter:
    """Intelligent model router with ML-inspired selection heuristics,
    A/B testing, and performance tracking."""

    def __init__(self, registry: dict[str, dict[str, Any]] | None = None):
        self._registry = dict(registry or MODEL_REGISTRY)
        self._stats: dict[str, _ModelStats] = defaultdict(_ModelStats)
        self._experiments: dict[str, _ABExperiment] = {}
        self._routing_log: dict[str, dict[str, Any]] = {}

    # ------------------------------------------------------------------
    # Core selection
    # ------------------------------------------------------------------

    def select_model(
        self,
        job_type: str,
        params: dict[str, Any] | None = None,
        user_prefs: dict[str, Any] | None = None,
        quality_history: dict[str, float] | None = None,
    ) -> dict[str, Any]:
        """Pick the best model for a job, returning model_id, confidence,
        reasoning string, and ranked alternatives."""
        params = params or {}
        user_prefs = user_prefs or {}
        quality_history = quality_history or {}

        candidates = self._candidates_for_type(job_type)
        if not candidates:
            raise ValueError(f"No models available for job type: {job_type}")

        scored: list[tuple[str, float, list[str]]] = []
        for mid in candidates:
            score, reasons = self._score_model(
                mid, job_type, params, user_prefs, quality_history
            )
            scored.append((mid, score, reasons))

        scored.sort(key=lambda x: x[1], reverse=True)
        best_mid, best_score, best_reasons = scored[0]

        job_id = str(uuid.uuid4())
        result = {
            "model_id": best_mid,
            "confidence": round(min(best_score, 1.0), 4),
            "reasoning": "; ".join(best_reasons),
            "alternatives": [
                {"model_id": m, "confidence": round(min(s, 1.0), 4)}
                for m, s, _ in scored[1:]
            ],
            "job_id": job_id,
        }

        self._routing_log[job_id] = {
            "model_id": best_mid,
            "job_type": job_type,
            "params": params,
            "reasoning": best_reasons,
            "alternatives": scored[1:],
            "timestamp": time.time(),
        }
        return result

    # ------------------------------------------------------------------
    # A/B testing
    # ------------------------------------------------------------------

    def route_with_ab_test(
        self,
        job_type: str,
        params: dict[str, Any] | None = None,
        experiment_id: str | None = None,
    ) -> dict[str, Any]:
        """Randomly assign to model variant A or B for the given experiment."""
        params = params or {}
        candidates = self._candidates_for_type(job_type)
        if len(candidates) < 2:
            raise ValueError(
                f"Need at least 2 models for A/B test on job type: {job_type}"
            )

        if experiment_id and experiment_id in self._experiments:
            exp = self._experiments[experiment_id]
        else:
            experiment_id = experiment_id or f"exp-{uuid.uuid4().hex[:8]}"
            sorted_cands = sorted(
                candidates,
                key=lambda m: self._registry[m].get("quality", 0),
                reverse=True,
            )
            exp = _ABExperiment(
                experiment_id=experiment_id,
                model_a=sorted_cands[0],
                model_b=sorted_cands[1],
            )
            self._experiments[experiment_id] = exp

        variant = random.choice(["A", "B"])
        model_id = exp.model_a if variant == "A" else exp.model_b

        request_id = uuid.uuid4().hex[:12]
        exp.assignments[request_id] = variant

        return {
            "model_id": model_id,
            "variant": variant,
            "experiment_id": exp.experiment_id,
        }

    # ------------------------------------------------------------------
    # Performance & resources
    # ------------------------------------------------------------------

    def get_model_performance(self, model_id: str) -> dict[str, Any]:
        """Return aggregate performance stats for a model."""
        self._require_model(model_id)
        st = self._stats[model_id]
        total = st.total_jobs or 1  # avoid division by zero
        return {
            "avg_quality": round(st.total_quality / total, 4) if st.total_jobs else 0.0,
            "avg_latency_ms": round(st.total_latency_ms / total, 2) if st.total_jobs else 0.0,
            "success_rate": round(st.successes / total, 4) if st.total_jobs else 0.0,
            "total_jobs": st.total_jobs,
            "gpu_utilization": round(
                min(st.gpu_seconds / max(total, 1) / 10.0, 1.0), 4
            ),
        }

    def estimate_resources(
        self, model_id: str, params: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Estimate GPU class, VRAM, time, and credit cost for a job."""
        self._require_model(model_id)
        info = self._registry[model_id]
        params = params or {}

        resolution = params.get("resolution", "720p")
        duration = params.get("duration", 5)

        res_mult = _RESOLUTION_RANK.get(resolution, 2) / 2.0
        vram = info.get("vram_gb", 8) * res_mult
        base_seconds = duration * 2.5 * res_mult
        cost = round(info.get("cost_per_sec", 0.02) * base_seconds, 4)

        gpu_class = info.get("gpu", "T4")
        # Upgrade GPU class if VRAM is very high
        if vram > 40:
            gpu_class = "H100"
        elif vram > 24:
            gpu_class = "A100"

        return {
            "gpu_class": gpu_class,
            "vram_required_gb": round(vram, 2),
            "estimated_seconds": round(base_seconds, 2),
            "cost_credits": cost,
        }

    # ------------------------------------------------------------------
    # Tracking & leaderboard
    # ------------------------------------------------------------------

    def track_model_result(
        self,
        model_id: str,
        job_id: str,
        quality_score: float,
        latency_ms: float,
    ) -> None:
        """Record the outcome of a completed job for a model."""
        self._require_model(model_id)
        st = self._stats[model_id]
        st.total_jobs += 1
        st.total_quality += quality_score
        st.total_latency_ms += latency_ms
        if quality_score > 0:
            st.successes += 1
        else:
            st.failures += 1
        st.gpu_seconds += latency_ms / 1000.0

    def get_model_leaderboard(self, job_type: str) -> list[dict[str, Any]]:
        """Return models ranked by quality for a given job type."""
        candidates = self._candidates_for_type(job_type)
        if not candidates:
            raise ValueError(f"No models available for job type: {job_type}")

        entries: list[dict[str, Any]] = []
        for mid in candidates:
            st = self._stats[mid]
            reg = self._registry[mid]
            if st.total_jobs > 0:
                avg_q = round(st.total_quality / st.total_jobs, 4)
            else:
                avg_q = reg.get("quality", 0.0)
            entries.append({
                "model_id": mid,
                "avg_quality": avg_q,
                "total_jobs": st.total_jobs,
                "registry_quality": reg.get("quality", 0.0),
            })

        entries.sort(key=lambda e: e["avg_quality"], reverse=True)
        return entries

    # ------------------------------------------------------------------
    # Routing explanation
    # ------------------------------------------------------------------

    def get_routing_explanation(self, job_id: str) -> str:
        """Human-readable explanation of why a model was chosen."""
        log = self._routing_log.get(job_id)
        if log is None:
            return f"No routing record found for job {job_id}."

        lines = [
            f"Job {job_id} was routed to model '{log['model_id']}' "
            f"for job type '{log['job_type']}'.",
            "Reasoning:",
        ]
        for r in log["reasoning"]:
            lines.append(f"  - {r}")

        if log["alternatives"]:
            lines.append("Alternatives considered:")
            for mid, score, _ in log["alternatives"]:
                lines.append(f"  - {mid} (score {score:.4f})")

        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _candidates_for_type(self, job_type: str) -> list[str]:
        """Return model IDs whose registry type matches *job_type*."""
        return [
            mid
            for mid, info in self._registry.items()
            if info.get("type") == job_type
        ]

    def _require_model(self, model_id: str) -> None:
        if model_id not in self._registry:
            raise ValueError(f"Unknown model: {model_id}")

    def _score_model(
        self,
        model_id: str,
        job_type: str,
        params: dict[str, Any],
        user_prefs: dict[str, Any],
        quality_history: dict[str, float],
    ) -> tuple[float, list[str]]:
        """Compute a composite score (0-1) and list of reasoning strings."""
        info = self._registry[model_id]
        reasons: list[str] = []
        score = 0.0

        # Base quality from registry (weight 0.35)
        base_q = info.get("quality", 0.5)
        score += base_q * 0.35
        reasons.append(f"base quality {base_q:.2f}")

        # Resolution fit (weight 0.15)
        requested_res = params.get("resolution")
        if requested_res:
            model_max = info.get("max_resolution")
            req_rank = _RESOLUTION_RANK.get(requested_res, 2)
            max_rank = _RESOLUTION_RANK.get(model_max, 2) if model_max else 5
            if max_rank >= req_rank:
                score += 0.15
                reasons.append(f"supports {requested_res}")
            else:
                reasons.append(f"max resolution {model_max} below requested {requested_res}")
        else:
            score += 0.10

        # Duration fit (weight 0.10)
        requested_dur = params.get("duration")
        if requested_dur and "max_duration" in info:
            if info["max_duration"] >= requested_dur:
                score += 0.10
                reasons.append(f"supports {requested_dur}s duration")
            else:
                reasons.append(
                    f"max duration {info['max_duration']}s < requested {requested_dur}s"
                )
        else:
            score += 0.08

        # User quality history (weight 0.20)
        if model_id in quality_history:
            hist_q = quality_history[model_id]
            score += hist_q * 0.20
            reasons.append(f"user history quality {hist_q:.2f}")
        else:
            score += base_q * 0.10
            reasons.append("no user history, using registry baseline")

        # User preference for cost vs quality (weight 0.10)
        preference = user_prefs.get("priority", "balanced")
        cost = info.get("cost_per_sec", 0.02)
        if preference == "cost":
            cost_score = max(0, 1.0 - cost * 10)
            score += cost_score * 0.10
            reasons.append(f"cost-optimized (cost/s={cost})")
        elif preference == "quality":
            score += base_q * 0.10
            reasons.append("quality-prioritized")
        else:
            score += 0.05
            reasons.append("balanced priority")

        # Tracked performance bonus (weight 0.10)
        st = self._stats.get(model_id)
        if st and st.total_jobs > 0:
            perf_q = st.total_quality / st.total_jobs
            score += perf_q * 0.10
            reasons.append(f"tracked perf {perf_q:.2f} over {st.total_jobs} jobs")
        else:
            score += base_q * 0.05
            reasons.append("no tracked performance data yet")

        return score, reasons
