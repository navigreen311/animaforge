"""Service layer for image-to-cartoon conversion."""

from __future__ import annotations

import random
import uuid
from typing import Any, Dict, List

from ..models.style_schemas import PipelineStage


# The seven canonical stages of the toon-conversion pipeline.
_PIPELINE_STAGES: List[str] = [
    "subject_detection",
    "line_extraction",
    "color_segmentation",
    "style_application",
    "toon_blend",
    "character_extraction",
    "consistency_lock",
]


def image_to_cartoon(
    image_url: str,
    style: str,
    strength: float,
) -> Dict[str, Any]:
    """Simulate the 7-stage cartoon-conversion pipeline.

    Each stage is executed with a mock duration; the result includes a
    job_id, the predicted output_url, and the list of completed stages.
    """
    job_id = uuid.uuid4().hex[:16]

    stages_completed: List[PipelineStage] = []
    for stage_name in _PIPELINE_STAGES:
        duration_ms = round(random.uniform(50.0, 300.0), 1)
        stages_completed.append(
            PipelineStage(
                name=stage_name,
                status="completed",
                duration_ms=duration_ms,
            )
        )

    output_url = (
        f"https://cdn.animaforge.io/cartoon/{job_id}"
        f"/{style}_s{strength:.2f}.png"
    )

    return {
        "job_id": job_id,
        "output_url": output_url,
        "stages_completed": stages_completed,
    }
