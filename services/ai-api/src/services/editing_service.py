"""Instruction-based editing service -- text-driven edits, inpainting, v2v transforms."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional


_CDN_BASE = "https://cdn.animaforge.ai/edits"


def apply_instruction_edit(
    output_url: str,
    instruction: str,
    mask_url: Optional[str] = None,
) -> dict[str, Any]:
    """Simulate applying a natural-language editing instruction to a video."""
    job_id = str(uuid.uuid4())
    edit_id = uuid.uuid4().hex[:12]
    edits: list[dict[str, Any]] = [
        {
            "type": "instruction",
            "instruction": instruction,
            "region": "masked" if mask_url else "full_frame",
            "mask_url": mask_url,
            "applied_at": datetime.now(timezone.utc).isoformat(),
        },
    ]
    return {
        "job_id": job_id,
        "output_url": f"{_CDN_BASE}/{edit_id}.mp4",
        "source_url": output_url,
        "edits_applied": edits,
    }


def apply_inpainting(
    output_url: str,
    mask_url: str,
    prompt: str,
) -> dict[str, Any]:
    """Simulate inpainting a masked region of a video with a prompt."""
    job_id = str(uuid.uuid4())
    edit_id = uuid.uuid4().hex[:12]
    edits: list[dict[str, Any]] = [
        {
            "type": "inpainting",
            "prompt": prompt,
            "mask_url": mask_url,
            "applied_at": datetime.now(timezone.utc).isoformat(),
        },
    ]
    return {
        "job_id": job_id,
        "output_url": f"{_CDN_BASE}/{edit_id}.mp4",
        "source_url": output_url,
        "edits_applied": edits,
    }


def apply_v2v_transform(
    input_url: str,
    style_ref: str,
    strength: float = 0.75,
) -> dict[str, Any]:
    """Simulate a video-to-video style transfer."""
    clamped = max(0.0, min(1.0, strength))
    job_id = str(uuid.uuid4())
    edit_id = uuid.uuid4().hex[:12]
    edits: list[dict[str, Any]] = [
        {
            "type": "v2v_transform",
            "style_ref": style_ref,
            "strength": clamped,
            "applied_at": datetime.now(timezone.utc).isoformat(),
        },
    ]
    return {
        "job_id": job_id,
        "output_url": f"{_CDN_BASE}/{edit_id}.mp4",
        "source_url": input_url,
        "edits_applied": edits,
    }
