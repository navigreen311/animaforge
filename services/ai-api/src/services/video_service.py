"""Video generation service – job creation, time estimation, credit costing."""

from __future__ import annotations

import uuid
from typing import Any

from ..models.video_schemas import JobDict, PipelineStage
from . import engines
from .engines import EngineUnavailable
from .video.diffusion import generate_video, video_available

# ---------------------------------------------------------------------------
# Tier configuration
# ---------------------------------------------------------------------------

_TIER_MULTIPLIERS: dict[str, float] = {
    "preview": 1.0,
    "standard": 2.5,
    "high": 5.0,
}

_BASE_SECONDS_PER_MS = 0.006  # base generation seconds per ms of output
_BASE_CREDITS_PER_MS = 0.0002  # base credit cost per ms of output

_DEFAULT_DURATION_MS = 5_000  # fallback when caller omits duration


# ---------------------------------------------------------------------------
# Pipeline stages (11 total)
# ---------------------------------------------------------------------------

def get_pipeline_stages() -> list[dict[str, Any]]:
    """Return the ordered list of 11 pipeline stages with estimated durations."""
    stages: list[dict[str, Any]] = [
        {"name": "scene_parse", "description": "Parse and validate the scene graph", "estimated_seconds": 0.5},
        {"name": "style_encode", "description": "Encode style reference into latent space", "estimated_seconds": 1.0},
        {"name": "character_encode", "description": "Encode character references", "estimated_seconds": 1.2},
        {"name": "layout_plan", "description": "Plan spatial layout from scene graph", "estimated_seconds": 0.8},
        {"name": "motion_plan", "description": "Generate motion trajectories", "estimated_seconds": 1.5},
        {"name": "keyframe_gen", "description": "Generate keyframes via diffusion", "estimated_seconds": 4.0},
        {"name": "interp_frames", "description": "Interpolate between keyframes", "estimated_seconds": 3.0},
        {"name": "upscale", "description": "Super-resolution upscaling pass", "estimated_seconds": 2.0},
        {"name": "composite", "description": "Composite layers and effects", "estimated_seconds": 1.0},
        {"name": "audio_sync", "description": "Synchronise audio track", "estimated_seconds": 0.8},
        {"name": "encode_output", "description": "Encode final video output", "estimated_seconds": 1.2},
    ]
    return stages


# ---------------------------------------------------------------------------
# Estimation helpers
# ---------------------------------------------------------------------------

def estimate_generation_time(tier: str, duration_ms: int | None = None) -> float:
    """Return estimated wall-clock seconds for a generation job.

    Parameters
    ----------
    tier:
        Quality tier (preview | standard | high).
    duration_ms:
        Requested output duration in milliseconds.  Falls back to the
        default (5 000 ms) when *None*.
    """
    dur = duration_ms if duration_ms is not None else _DEFAULT_DURATION_MS
    multiplier = _TIER_MULTIPLIERS.get(tier, _TIER_MULTIPLIERS["preview"])
    base = dur * _BASE_SECONDS_PER_MS
    pipeline_overhead = sum(s["estimated_seconds"] for s in get_pipeline_stages())
    return round(base * multiplier + pipeline_overhead, 2)


def calculate_credit_cost(tier: str, duration_ms: int | None = None) -> float:
    """Return the credit cost for generating video of the given tier & length.

    Parameters
    ----------
    tier:
        Quality tier (preview | standard | high).
    duration_ms:
        Requested output duration in milliseconds.  Falls back to the
        default (5 000 ms) when *None*.
    """
    dur = duration_ms if duration_ms is not None else _DEFAULT_DURATION_MS
    multiplier = _TIER_MULTIPLIERS.get(tier, _TIER_MULTIPLIERS["preview"])
    return round(dur * _BASE_CREDITS_PER_MS * multiplier, 4)


# ---------------------------------------------------------------------------
# Job creation
# ---------------------------------------------------------------------------

def create_video_job(params: dict[str, Any]) -> dict[str, Any]:
    """Create a video generation job.

    Renders for real when ``VIDEO_ENGINE=real`` is provisioned; otherwise
    returns a queued job with **no preview URL** and an ``is_mock`` marker
    saying why. Nothing in this function ever invents a URL.

    Parameters
    ----------
    params:
        Must contain at least ``tier``. May contain ``duration_ms``,
        ``prompt``, ``num_frames``, ``seed`` and ``image_path``.
    """
    tier: str = params.get("tier", "preview")
    duration_ms: int | None = params.get("duration_ms")

    estimated = estimate_generation_time(tier, duration_ms)
    cost = calculate_credit_cost(tier, duration_ms)
    stages = get_pipeline_stages()

    job_id = str(uuid.uuid4())
    prompt = str(params.get("prompt", "")).strip()

    # The gated engine, when provisioned, actually renders. Anything else
    # returns a job with no preview_url, because there is no clip.
    if video_available() and prompt:
        try:
            result = generate_video(
                prompt,
                job_id=job_id,
                num_frames=int(params.get("num_frames", 16)),
                seed=int(params.get("seed", 0)),
                image_path=params.get("image_path"),
            )
        except EngineUnavailable as exc:
            return _unrendered_job(
                job_id, tier, estimated, cost, stages, str(exc)
            )

        job = JobDict(
            id=job_id,
            status="completed",
            tier=tier,
            estimated_seconds=estimated,
            credit_cost=cost,
            preview_url=result.url,
            stages=[PipelineStage(**s) for s in stages],
        )
        payload = job.model_dump()
        payload["engine"] = engines.real_marker(
            "video", detail=f"Rendered {result.frame_count} frames with {result.model_id}."
        )
        payload["artifact"] = result.as_dict()
        return payload

    return _unrendered_job(
        job_id,
        tier,
        estimated,
        cost,
        stages,
        "No video engine is active on this host.",
    )


def _unrendered_job(
    job_id: str,
    tier: str,
    estimated: float,
    cost: float,
    stages: list[dict[str, Any]],
    reason: str,
) -> dict[str, Any]:
    """A queued job for which nothing was rendered.

    Carries no ``preview_url``. The previous implementation returned
    ``https://cdn.animaforge.ai/preview/<random>.mp4`` for every job, which
    pointed at nothing and always would -- no renderer existed to write it.
    Stages are reported ``pending``, not completed, for the same reason.
    """
    job = JobDict(
        id=job_id,
        status="queued",
        tier=tier,
        estimated_seconds=estimated,
        credit_cost=cost,
        preview_url=None,
        stages=[PipelineStage(**s) for s in stages],
    )
    payload = job.model_dump()
    payload["engine"] = engines.mock_marker("video", detail=reason)
    return payload
