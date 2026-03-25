"""Service layer for style fingerprint extraction."""

from __future__ import annotations

from datetime import datetime, timezone

from ..models.style_schemas import StyleFingerprint


def extract_style_fingerprint(source_url: str, source_type: str) -> StyleFingerprint:
    """Analyse source_url and return a mock StyleFingerprint.

    In production this would delegate to a vision model pipeline; for now it
    returns a deterministic mock so the API contract is exercisable end-to-end.
    """
    return StyleFingerprint(
        color_palette=["#2C3E50", "#E74C3C", "#ECF0F1", "#3498DB", "#F39C12"],
        contrast_profile="high",
        grain_noise=0.35,
        saturation_curve="warm-shift",
        lens_character="anamorphic",
        depth_of_field="shallow",
        camera_motion="steadicam",
        line_weight="medium",
        fill_style="gradient",
        shading_approach="soft",
        source_url=source_url,
        source_type=source_type,
        confidence=0.87,
        created_at=datetime.now(timezone.utc),
    )
