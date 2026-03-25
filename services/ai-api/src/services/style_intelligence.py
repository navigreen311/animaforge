"""Style Intelligence service — X6b full implementation.

Provides video/animation fingerprinting, comparison, blending, style transfer,
presets, evolution tracking, and consistency correction suggestions.
"""

from __future__ import annotations

import hashlib
import math
import random
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from ..models.style_schemas import StyleFingerprint

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

STYLE_DIMENSIONS: List[str] = [
    "color",
    "contrast",
    "grain",
    "lens",
    "motion",
    "line",
    "fill",
    "shading",
    "timing",
]

# In-memory preset store (production would use a database)
_preset_store: Dict[str, Dict[str, Any]] = {}

# In-memory project style history (production would use a database)
_project_style_history: Dict[str, List[Dict[str, Any]]] = {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _seed_from_url(url: str) -> int:
    """Derive a deterministic seed from a URL for reproducible mock data."""
    return int(hashlib.sha256(url.encode()).hexdigest()[:8], 16)


def _random_palette(rng: random.Random, count: int = 5) -> List[str]:
    return [f"#{rng.randint(0, 0xFFFFFF):06X}" for _ in range(count)]


def _pick(rng: random.Random, options: List[str]) -> str:
    return options[rng.randint(0, len(options) - 1)]


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


# ---------------------------------------------------------------------------
# Core fingerprint extraction
# ---------------------------------------------------------------------------

def extract_video_fingerprint(video_url: str) -> StyleFingerprint:
    """Analyse video frames and return a full StyleFingerprint.

    In production this delegates to a vision model pipeline (frame sampling,
    colour histogram, edge detection, optical-flow analysis, etc.).  The mock
    implementation returns deterministic-but-varied data based on the URL.
    """
    rng = random.Random(_seed_from_url(video_url))

    return StyleFingerprint(
        color_palette=_random_palette(rng),
        contrast_profile=_pick(rng, ["high", "low", "mixed", "dynamic"]),
        grain_noise=round(rng.uniform(0.05, 0.90), 2),
        saturation_curve=_pick(rng, ["warm-shift", "cool-shift", "neutral", "desaturated"]),
        lens_character=_pick(rng, ["anamorphic", "spherical", "vintage", "modern"]),
        depth_of_field=_pick(rng, ["shallow", "deep", "rack-focus", "infinite"]),
        camera_motion=_pick(rng, ["handheld", "steadicam", "static", "crane", "drone"]),
        line_weight="medium",
        fill_style="gradient",
        shading_approach="soft",
        source_url=video_url,
        source_type="video",
        confidence=round(rng.uniform(0.70, 0.98), 2),
        created_at=datetime.now(timezone.utc),
    )


def extract_animation_fingerprint(video_url: str) -> Dict[str, Any]:
    """Extract animation-specific fingerprint from an animation source.

    Returns both a base StyleFingerprint and animation-specific metadata
    covering line work, fill, shading, motion principles, timing, and
    character proportions.
    """
    rng = random.Random(_seed_from_url(video_url))

    base_fp = StyleFingerprint(
        color_palette=_random_palette(rng),
        contrast_profile=_pick(rng, ["high", "low", "flat", "stylised"]),
        grain_noise=round(rng.uniform(0.0, 0.30), 2),
        saturation_curve=_pick(rng, ["vivid", "pastel", "muted", "warm-shift"]),
        lens_character=_pick(rng, ["flat", "simulated-depth", "multiplane"]),
        depth_of_field=_pick(rng, ["flat", "layered", "rack-focus"]),
        camera_motion=_pick(rng, ["pan", "static", "parallax", "tracking"]),
        line_weight=_pick(rng, ["thin", "medium", "bold", "variable"]),
        fill_style=_pick(rng, ["flat", "gradient", "textured", "cel"]),
        shading_approach=_pick(rng, ["cel", "soft", "cross-hatch", "ambient-occlusion"]),
        source_url=video_url,
        source_type="animation",
        confidence=round(rng.uniform(0.72, 0.96), 2),
        created_at=datetime.now(timezone.utc),
    )

    animation_meta = {
        "line_weight": base_fp.line_weight,
        "fill_style": base_fp.fill_style,
        "shading_approach": base_fp.shading_approach,
        "motion_principles": {
            "squash_stretch": round(rng.uniform(0.1, 1.0), 2),
            "anticipation": round(rng.uniform(0.1, 1.0), 2),
            "smear": round(rng.uniform(0.0, 0.8), 2),
        },
        "timing_style": _pick(rng, ["ones", "twos", "threes", "mixed"]),
        "char_proportions": {
            "head_to_body": round(rng.uniform(0.15, 0.40), 2),
            "limb_length": _pick(rng, ["realistic", "stylised-long", "chibi", "heroic"]),
            "eye_size": _pick(rng, ["small", "medium", "large", "exaggerated"]),
        },
    }

    return {
        "fingerprint": base_fp,
        "animation_meta": animation_meta,
    }


# ---------------------------------------------------------------------------
# Comparison
# ---------------------------------------------------------------------------

def _dimension_similarity(fp_a: StyleFingerprint, fp_b: StyleFingerprint, dim: str) -> float:
    """Compute similarity for a single dimension (0 = different, 1 = identical)."""
    mapping = {
        "color": ("color_palette", "list"),
        "contrast": ("contrast_profile", "str"),
        "grain": ("grain_noise", "float"),
        "lens": ("lens_character", "str"),
        "motion": ("camera_motion", "str"),
        "line": ("line_weight", "str"),
        "fill": ("fill_style", "str"),
        "shading": ("shading_approach", "str"),
        "timing": ("saturation_curve", "str"),  # proxy for timing/mood
    }
    attr, kind = mapping[dim]
    val_a = getattr(fp_a, attr)
    val_b = getattr(fp_b, attr)

    if kind == "str":
        return 1.0 if val_a == val_b else 0.0
    elif kind == "float":
        return round(1.0 - abs(val_a - val_b), 4)
    elif kind == "list":
        set_a, set_b = set(val_a), set(val_b)
        if not set_a and not set_b:
            return 1.0
        intersection = len(set_a & set_b)
        union = len(set_a | set_b)
        return round(intersection / union, 4) if union else 1.0
    return 0.0


def compare_fingerprints(fp_a: StyleFingerprint, fp_b: StyleFingerprint) -> Dict[str, Any]:
    """Compare two fingerprints across all style dimensions.

    Returns overall similarity (0-1) and per-dimension scores.
    """
    dimension_scores: Dict[str, float] = {}
    for dim in STYLE_DIMENSIONS:
        dimension_scores[dim] = _dimension_similarity(fp_a, fp_b, dim)

    overall = round(sum(dimension_scores.values()) / len(STYLE_DIMENSIONS), 4)
    return {
        "similarity": overall,
        "dimension_scores": dimension_scores,
    }


# ---------------------------------------------------------------------------
# Blending
# ---------------------------------------------------------------------------

def blend_fingerprints(
    fingerprints: List[StyleFingerprint],
    weights: List[float],
) -> StyleFingerprint:
    """Create a weighted blend of multiple style fingerprints.

    Numeric fields are linearly interpolated; categorical fields are chosen
    from the fingerprint with the highest weight; colour palettes are merged
    and de-duplicated.
    """
    if len(fingerprints) != len(weights):
        raise ValueError("fingerprints and weights must have the same length")
    if not fingerprints:
        raise ValueError("At least one fingerprint is required")

    total_w = sum(weights)
    if total_w == 0:
        raise ValueError("Weights must sum to a positive number")
    norm = [w / total_w for w in weights]

    # Highest-weight fingerprint for categorical fields
    dominant_idx = norm.index(max(norm))
    dominant = fingerprints[dominant_idx]

    # Blend grain_noise (numeric)
    blended_grain = _clamp(round(sum(fp.grain_noise * w for fp, w in zip(fingerprints, norm)), 2))

    # Blend confidence
    blended_confidence = _clamp(round(sum(fp.confidence * w for fp, w in zip(fingerprints, norm)), 2))

    # Merge colour palettes, weighted — take more colours from higher-weighted fps
    merged_colors: List[str] = []
    for fp, w in zip(fingerprints, norm):
        count = max(1, round(len(fp.color_palette) * w))
        merged_colors.extend(fp.color_palette[:count])
    # De-duplicate while preserving order
    seen: set[str] = set()
    unique_colors: List[str] = []
    for c in merged_colors:
        if c not in seen:
            seen.add(c)
            unique_colors.append(c)

    return StyleFingerprint(
        color_palette=unique_colors[:8],
        contrast_profile=dominant.contrast_profile,
        grain_noise=blended_grain,
        saturation_curve=dominant.saturation_curve,
        lens_character=dominant.lens_character,
        depth_of_field=dominant.depth_of_field,
        camera_motion=dominant.camera_motion,
        line_weight=dominant.line_weight,
        fill_style=dominant.fill_style,
        shading_approach=dominant.shading_approach,
        source_url="blend",
        source_type="blend",
        confidence=blended_confidence,
        created_at=datetime.now(timezone.utc),
    )


# ---------------------------------------------------------------------------
# Style Transfer
# ---------------------------------------------------------------------------

def apply_style_transfer(
    content_url: str,
    fingerprint: StyleFingerprint,
    strength: float = 0.8,
    preserve_content: float = 0.5,
) -> Dict[str, Any]:
    """Simulate applying a style fingerprint to content.

    Returns a mock job result with the applied parameters and a generated
    output URL.
    """
    if not 0.0 <= strength <= 1.0:
        raise ValueError("strength must be between 0.0 and 1.0")
    if not 0.0 <= preserve_content <= 1.0:
        raise ValueError("preserve_content must be between 0.0 and 1.0")

    job_id = uuid.uuid4().hex[:16]
    return {
        "job_id": job_id,
        "status": "completed",
        "content_url": content_url,
        "output_url": f"https://cdn.animaforge.ai/transfers/{job_id}.mp4",
        "strength": strength,
        "preserve_content": preserve_content,
        "style_applied": {
            "contrast_profile": fingerprint.contrast_profile,
            "lens_character": fingerprint.lens_character,
            "color_palette": fingerprint.color_palette,
            "grain_noise": round(fingerprint.grain_noise * strength, 2),
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Presets
# ---------------------------------------------------------------------------

def create_style_preset(
    name: str,
    fingerprint: StyleFingerprint,
    variations: Optional[List[float]] = None,
) -> Dict[str, Any]:
    """Save a fingerprint as a reusable preset with strength variations.

    Each variation is a pre-computed snapshot at a given strength level.
    """
    if variations is None:
        variations = [0.25, 0.50, 0.75, 1.0]

    preset_id = uuid.uuid4().hex[:12]
    variation_entries = []
    for v in variations:
        variation_entries.append({
            "strength": v,
            "grain_noise": round(fingerprint.grain_noise * v, 2),
            "label": f"{name}_s{v}",
        })

    preset = {
        "preset_id": preset_id,
        "name": name,
        "fingerprint": fingerprint.model_dump(mode="json"),
        "variations": variation_entries,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _preset_store[preset_id] = preset
    return preset


def list_style_presets() -> List[Dict[str, Any]]:
    """Return all saved style presets."""
    return list(_preset_store.values())


def clear_presets() -> None:
    """Clear all presets (used in testing)."""
    _preset_store.clear()


# ---------------------------------------------------------------------------
# Evolution & Consistency
# ---------------------------------------------------------------------------

def analyze_style_evolution(project_id: str) -> Dict[str, Any]:
    """Track how style changes across shots in a project.

    In production this iterates over rendered shots, extracts per-shot
    fingerprints, and computes drift.  The mock implementation returns a
    plausible evolution report.
    """
    rng = random.Random(_seed_from_url(project_id))
    num_shots = rng.randint(5, 15)

    shots = []
    drift_scores = []
    for i in range(num_shots):
        drift = round(rng.uniform(0.0, 0.35), 3)
        drift_scores.append(drift)
        shots.append({
            "shot_index": i,
            "shot_id": f"shot_{uuid.uuid4().hex[:8]}",
            "drift_from_baseline": drift,
            "dominant_shift": _pick(rng, STYLE_DIMENSIONS),
        })

    avg_drift = round(sum(drift_scores) / len(drift_scores), 4)
    max_drift = max(drift_scores)
    consistency_grade = (
        "A" if avg_drift < 0.08 else
        "B" if avg_drift < 0.15 else
        "C" if avg_drift < 0.22 else
        "D"
    )

    return {
        "project_id": project_id,
        "total_shots": num_shots,
        "average_drift": avg_drift,
        "max_drift": round(max_drift, 4),
        "consistency_grade": consistency_grade,
        "shots": shots,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }


def suggest_style_corrections(project_id: str) -> Dict[str, Any]:
    """Suggest adjustments to maintain style consistency across a project.

    Builds on evolution analysis — for each shot that exceeds a drift
    threshold, generates a correction suggestion.
    """
    evolution = analyze_style_evolution(project_id)
    threshold = 0.15
    corrections = []

    for shot in evolution["shots"]:
        if shot["drift_from_baseline"] > threshold:
            corrections.append({
                "shot_id": shot["shot_id"],
                "shot_index": shot["shot_index"],
                "issue": f"{shot['dominant_shift']} drift detected "
                         f"({shot['drift_from_baseline']:.3f} > {threshold})",
                "suggestion": f"Re-apply baseline {shot['dominant_shift']} settings "
                              f"at strength {round(1.0 - shot['drift_from_baseline'], 2)}",
                "severity": "high" if shot["drift_from_baseline"] > 0.25 else "medium",
            })

    return {
        "project_id": project_id,
        "total_shots": evolution["total_shots"],
        "corrections_needed": len(corrections),
        "corrections": corrections,
        "overall_health": "good" if len(corrections) == 0 else (
            "fair" if len(corrections) <= 3 else "needs_attention"
        ),
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }
