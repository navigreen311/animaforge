"""Motion controls service -- camera control, motion modules, motion spec extraction."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional


MOTION_TYPES = (
    "static", "pan_left", "pan_right", "tilt_up", "tilt_down",
    "dolly_in", "dolly_out", "orbit", "handheld", "crane",
)

_DEFAULT_CAMERA_SPEC: dict[str, Any] = {
    "type": "static",
    "angle": 0.0,
    "speed": 1.0,
    "easing": "ease-in-out",
}


def generate_motion_spec(scene_graph: dict[str, Any]) -> dict[str, Any]:
    """Extract motion parameters from the camera field of a scene graph."""
    camera_raw: dict[str, Any] = scene_graph.get("camera", {})
    camera_spec = {
        "type": camera_raw.get("type", _DEFAULT_CAMERA_SPEC["type"]),
        "angle": float(camera_raw.get("angle", _DEFAULT_CAMERA_SPEC["angle"])),
        "speed": float(camera_raw.get("speed", _DEFAULT_CAMERA_SPEC["speed"])),
        "easing": camera_raw.get("easing", _DEFAULT_CAMERA_SPEC["easing"]),
    }
    elements = scene_graph.get("elements", [])
    element_motions: list[dict[str, Any]] = []
    for elem in elements:
        motion = elem.get("motion", {})
        element_motions.append({
            "element_id": elem.get("id", "unknown"),
            "motion_type": motion.get("type", "static"),
            "intensity": float(motion.get("intensity", 0.5)),
            "path": motion.get("path"),
        })
    return {
        "camera_spec": camera_spec,
        "element_motions": element_motions,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
    }


def apply_camera_control(
    job_id: str,
    camera_spec: dict[str, Any],
) -> dict[str, Any]:
    """Simulate applying 3D camera movement to a generation job."""
    validated_spec = {
        "type": camera_spec.get("type", "static"),
        "angle": float(camera_spec.get("angle", 0.0)),
        "speed": float(camera_spec.get("speed", 1.0)),
        "easing": camera_spec.get("easing", "ease-in-out"),
        "start_position": camera_spec.get("start_position"),
        "end_position": camera_spec.get("end_position"),
    }
    return {
        "job_id": job_id,
        "camera_control": validated_spec,
        "status": "applied",
        "applied_at": datetime.now(timezone.utc).isoformat(),
    }


def apply_motion_module(
    job_id: str,
    motion_type: str,
    intensity: float = 0.5,
) -> dict[str, Any]:
    """Simulate applying an AnimateDiff-style motion module to a job."""
    if motion_type not in MOTION_TYPES:
        raise ValueError(
            f"Unsupported motion type {motion_type!r}. "
            f"Must be one of: {', '.join(MOTION_TYPES)}"
        )
    clamped = max(0.0, min(1.0, intensity))
    return {
        "job_id": job_id,
        "motion_module": {
            "type": motion_type,
            "intensity": clamped,
        },
        "status": "applied",
        "applied_at": datetime.now(timezone.utc).isoformat(),
    }
