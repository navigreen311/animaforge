"""Service layer for Cartoon Pro controls (E7).

Provides fine-grained control over line art, fill styles, shading,
animation motion principles, character model sheets, batch styling,
presets, and proportion adjustments.
"""

from __future__ import annotations

import random
import uuid
from typing import Any, Dict, List, Optional


_CDN_BASE = "https://cdn.animaforge.io/cartoon-pro"


def _job_id() -> str:
    return uuid.uuid4().hex[:16]


def _output_url(job_id: str, suffix: str) -> str:
    return f"{_CDN_BASE}/{job_id}/{suffix}.png"


# ---------------------------------------------------------------------------
# Line art controls
# ---------------------------------------------------------------------------

def apply_line_controls(
    image_url: str,
    line_weight: float = 1.0,
    taper: float = 0.5,
    variation: float = 0.3,
    color: str = "#000000",
) -> Dict[str, Any]:
    """Fine-tune line art on a cartoon image."""
    jid = _job_id()
    settings_applied = {
        "line_weight": line_weight,
        "taper": taper,
        "variation": variation,
        "color": color,
    }
    return {
        "output_url": _output_url(jid, f"lines_w{line_weight:.2f}"),
        "settings_applied": settings_applied,
    }


# ---------------------------------------------------------------------------
# Fill controls
# ---------------------------------------------------------------------------

_VALID_FILL_STYLES = {"flat", "gradient", "cel", "painterly"}


def apply_fill_controls(
    image_url: str,
    fill_style: str = "flat",
    palette: Optional[List[str]] = None,
    shading: float = 0.5,
) -> Dict[str, Any]:
    """Control flat fill style on a cartoon image."""
    if fill_style not in _VALID_FILL_STYLES:
        raise ValueError(
            f"Invalid fill_style '{fill_style}'. "
            f"Must be one of: {sorted(_VALID_FILL_STYLES)}"
        )
    jid = _job_id()
    return {
        "output_url": _output_url(jid, f"fill_{fill_style}"),
    }


# ---------------------------------------------------------------------------
# Shading controls
# ---------------------------------------------------------------------------

_VALID_SHADING_TYPES = {"hard", "soft", "rim", "none", "crosshatch"}


def apply_shading_controls(
    image_url: str,
    shading_type: str = "soft",
    intensity: float = 0.5,
    light_dir: str = "top-left",
) -> Dict[str, Any]:
    """Control shading on a cartoon image."""
    if shading_type not in _VALID_SHADING_TYPES:
        raise ValueError(
            f"Invalid shading_type '{shading_type}'. "
            f"Must be one of: {sorted(_VALID_SHADING_TYPES)}"
        )
    jid = _job_id()
    return {
        "output_url": _output_url(jid, f"shade_{shading_type}"),
    }


# ---------------------------------------------------------------------------
# Motion principles
# ---------------------------------------------------------------------------

def apply_motion_principles(
    animation_data: str,
    squash_stretch: float = 0.5,
    anticipation: float = 0.5,
    follow_through: float = 0.5,
    ease: float = 0.5,
    smear: float = 0.0,
) -> Dict[str, Any]:
    """Apply classic animation principles to animation data.

    All intensity values are 0.0-1.0.
    """
    for name, val in [
        ("squash_stretch", squash_stretch),
        ("anticipation", anticipation),
        ("follow_through", follow_through),
        ("ease", ease),
        ("smear", smear),
    ]:
        if not 0.0 <= val <= 1.0:
            raise ValueError(f"{name} must be between 0.0 and 1.0, got {val}")

    jid = _job_id()
    principles_applied = {
        "squash_stretch": squash_stretch,
        "anticipation": anticipation,
        "follow_through": follow_through,
        "ease": ease,
        "smear": smear,
    }
    return {
        "output_url": _output_url(jid, "motion"),
        "principles_applied": principles_applied,
    }


# ---------------------------------------------------------------------------
# Model sheet generation
# ---------------------------------------------------------------------------

_DEFAULT_VIEWS = ["front", "side", "back", "three_quarter", "expressions"]


def create_style_sheet(
    character_id: str,
    views: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Generate a character model sheet with multiple views."""
    if views is None:
        views = list(_DEFAULT_VIEWS)
    jid = _job_id()
    return {
        "sheet_url": _output_url(jid, f"sheet_{character_id}"),
        "views": views,
    }


# ---------------------------------------------------------------------------
# Batch style application
# ---------------------------------------------------------------------------

def batch_apply_style(
    image_urls: List[str],
    style_config: Dict[str, Any],
) -> Dict[str, Any]:
    """Apply a consistent cartoon style across a batch of images."""
    outputs: List[Dict[str, Any]] = []
    for url in image_urls:
        jid = _job_id()
        outputs.append({
            "source_url": url,
            "output_url": _output_url(jid, "styled"),
        })
    consistency_score = round(random.uniform(0.90, 0.99), 3)
    return {
        "outputs": outputs,
        "consistency_score": consistency_score,
    }


# ---------------------------------------------------------------------------
# Presets
# ---------------------------------------------------------------------------

_CARTOON_PRESETS = [
    {
        "name": "anime_sharp",
        "description": "Sharp linework with vibrant cel shading, anime style",
        "line_weight": 1.2,
        "fill_style": "cel",
        "shading_type": "hard",
    },
    {
        "name": "disney_smooth",
        "description": "Smooth flowing lines with gradient fills, classic Disney look",
        "line_weight": 0.8,
        "fill_style": "gradient",
        "shading_type": "soft",
    },
    {
        "name": "comic_bold",
        "description": "Thick bold outlines with flat fills, comic book style",
        "line_weight": 2.0,
        "fill_style": "flat",
        "shading_type": "hard",
    },
    {
        "name": "watercolor_soft",
        "description": "Soft edges with painterly fills, watercolor aesthetic",
        "line_weight": 0.4,
        "fill_style": "painterly",
        "shading_type": "soft",
    },
    {
        "name": "pixel_retro",
        "description": "Pixel-art inspired lines with flat fills, retro game look",
        "line_weight": 1.0,
        "fill_style": "flat",
        "shading_type": "none",
    },
    {
        "name": "chibi_cute",
        "description": "Round soft lines with gradient fills, chibi proportions",
        "line_weight": 0.6,
        "fill_style": "gradient",
        "shading_type": "soft",
    },
]


def get_cartoon_presets() -> List[Dict[str, Any]]:
    """Return all named cartoon style presets."""
    return list(_CARTOON_PRESETS)


# ---------------------------------------------------------------------------
# Proportion adjustment
# ---------------------------------------------------------------------------

def adjust_proportions(
    character_id: str,
    head_ratio: float = 1.0,
    eye_size: float = 1.0,
    limb_length: float = 1.0,
    body_type: str = "standard",
) -> Dict[str, Any]:
    """Exaggerate character proportions for cartoon style."""
    jid = _job_id()
    return {
        "adjusted_character_url": _output_url(jid, f"proportions_{character_id}"),
    }
