"""Motion capture input service -- BVH parsing, retargeting, blending, keyframe export."""

from __future__ import annotations

import math
import re
import uuid
from typing import Any

# ── Constants ────────────────────────────────────────────────────────────────

SUPPORTED_FORMATS: list[str] = ["bvh", "fbx", "c3d", "trc"]

_MAX_DURATION_MS = 600_000  # 10 minutes
_MIN_FPS = 1
_MAX_FPS = 240


# ── Public API ───────────────────────────────────────────────────────────────


def parse_bvh(file_url: str) -> dict[str, Any]:
    """Parse a BVH motion capture file and return structured motion data.

    In production this would download and parse the binary BVH hierarchy /
    motion sections.  Here we simulate the parse with realistic defaults.
    """
    _validate_file_url(file_url, "bvh")

    joints = _build_default_joint_hierarchy()
    frame_count = 120
    fps = 30.0
    duration_ms = int((frame_count / fps) * 1000)

    keyframes = _generate_keyframes(joints, frame_count, fps)

    return {
        "motion_id": _new_motion_id(),
        "format": "bvh",
        "joint_count": len(joints),
        "frame_count": frame_count,
        "fps": fps,
        "duration_ms": duration_ms,
        "joints": joints,
        "keyframes": keyframes,
    }


def parse_fbx_motion(file_url: str) -> dict[str, Any]:
    """Parse FBX motion data (stub) and return structured motion data.

    FBX is a proprietary Autodesk format; full parsing requires the FBX SDK.
    This stub returns a realistic skeleton with placeholder keyframes.
    """
    _validate_file_url(file_url, "fbx")

    joints = _build_default_joint_hierarchy()
    frame_count = 90
    fps = 24.0
    duration_ms = int((frame_count / fps) * 1000)

    keyframes = _generate_keyframes(joints, frame_count, fps)

    return {
        "motion_id": _new_motion_id(),
        "format": "fbx",
        "joint_count": len(joints),
        "frame_count": frame_count,
        "fps": fps,
        "duration_ms": duration_ms,
        "joints": joints,
        "keyframes": keyframes,
    }


def retarget_motion(
    source_motion: dict[str, Any],
    target_character_id: str,
) -> dict[str, Any]:
    """Map motion capture data to a target character rig.

    Performs joint-name matching between the source skeleton and the
    target character's rig.  Joints that cannot be mapped are collected
    in ``unmapped_joints``.
    """
    source_joints: list[dict[str, Any]] = source_motion.get("joints", [])
    if not source_joints:
        raise ValueError("source_motion contains no joints")

    # Simulate rig mapping -- assume 85% of joints map cleanly
    mapped_count = max(1, int(len(source_joints) * 0.85))
    mapped_joints = source_joints[:mapped_count]
    unmapped_joints = [j["name"] for j in source_joints[mapped_count:]]
    compatibility_score = round(mapped_count / len(source_joints), 2)

    retargeted = {
        **source_motion,
        "motion_id": _new_motion_id(),
        "target_character_id": target_character_id,
        "joints": mapped_joints,
        "joint_count": len(mapped_joints),
    }

    return {
        "retargeted_motion": retargeted,
        "compatibility_score": compatibility_score,
        "unmapped_joints": unmapped_joints,
    }


def blend_motions(
    motion_a: dict[str, Any],
    motion_b: dict[str, Any],
    blend_factor: float,
) -> dict[str, Any]:
    """Linearly interpolate between two motions using *blend_factor*.

    A ``blend_factor`` of 0.0 yields pure *motion_a*; 1.0 yields pure
    *motion_b*.  Values are clamped to [0, 1].
    """
    blend_factor = max(0.0, min(1.0, blend_factor))

    kf_a = motion_a.get("keyframes", [])
    kf_b = motion_b.get("keyframes", [])
    min_len = min(len(kf_a), len(kf_b))

    blended_keyframes: list[dict[str, Any]] = []
    for i in range(min_len):
        blended_keyframes.append(_lerp_keyframe(kf_a[i], kf_b[i], blend_factor))

    # Use weighted average for frame count / fps
    fps_a = motion_a.get("fps", 30.0)
    fps_b = motion_b.get("fps", 30.0)
    blended_fps = round(fps_a * (1 - blend_factor) + fps_b * blend_factor, 2)

    return {
        "motion_id": _new_motion_id(),
        "format": "blended",
        "frame_count": min_len,
        "fps": blended_fps,
        "duration_ms": int((min_len / blended_fps) * 1000) if blended_fps > 0 else 0,
        "blend_factor": blend_factor,
        "keyframes": blended_keyframes,
    }


def motion_to_keyframes(
    motion_data: dict[str, Any],
    shot_id: str,
) -> dict[str, Any]:
    """Convert motion capture data to timeline keyframes for a shot."""
    keyframes = motion_data.get("keyframes", [])
    fps = motion_data.get("fps", 30.0)

    timeline_keyframes: list[dict[str, Any]] = []
    for idx, kf in enumerate(keyframes):
        timeline_keyframes.append({
            "shot_id": shot_id,
            "frame_index": idx,
            "timestamp_ms": int((idx / fps) * 1000) if fps > 0 else 0,
            "joint_transforms": kf.get("joint_transforms", {}),
        })

    return {
        "shot_id": shot_id,
        "motion_id": motion_data.get("motion_id", "unknown"),
        "keyframe_count": len(timeline_keyframes),
        "duration_ms": motion_data.get("duration_ms", 0),
        "keyframes": timeline_keyframes,
    }


def validate_motion_data(data: dict[str, Any]) -> dict[str, Any]:
    """Validate motion data for frame rate, joint hierarchy, and duration bounds.

    Returns ``{"valid": True/False, "errors": [...]}``.
    """
    errors: list[str] = []

    # Frame rate
    fps = data.get("fps")
    if fps is None:
        errors.append("missing fps")
    elif not (_MIN_FPS <= fps <= _MAX_FPS):
        errors.append(f"fps {fps} out of range [{_MIN_FPS}, {_MAX_FPS}]")

    # Duration
    duration_ms = data.get("duration_ms")
    if duration_ms is None:
        errors.append("missing duration_ms")
    elif duration_ms <= 0:
        errors.append("duration_ms must be positive")
    elif duration_ms > _MAX_DURATION_MS:
        errors.append(f"duration_ms {duration_ms} exceeds maximum {_MAX_DURATION_MS}")

    # Joint hierarchy
    joints = data.get("joints")
    if joints is None or not isinstance(joints, list):
        errors.append("missing or invalid joints list")
    elif len(joints) == 0:
        errors.append("joints list is empty")
    else:
        root_joints = [j for j in joints if j.get("parent") is None]
        if len(root_joints) == 0:
            errors.append("joint hierarchy has no root joint")

    # Frame count
    frame_count = data.get("frame_count")
    if frame_count is not None and frame_count <= 0:
        errors.append("frame_count must be positive")

    return {"valid": len(errors) == 0, "errors": errors}


# ── Helpers ──────────────────────────────────────────────────────────────────


def _new_motion_id() -> str:
    return f"mocap-{uuid.uuid4().hex[:12]}"


def _validate_file_url(file_url: str, expected_ext: str) -> None:
    if not file_url:
        raise ValueError("file_url must not be empty")
    if not file_url.lower().endswith(f".{expected_ext}"):
        raise ValueError(
            f"Expected .{expected_ext} file, got: {file_url}"
        )


def _build_default_joint_hierarchy() -> list[dict[str, Any]]:
    """Return a simplified humanoid skeleton hierarchy."""
    return [
        {"name": "Hips", "parent": None, "index": 0},
        {"name": "Spine", "parent": "Hips", "index": 1},
        {"name": "Spine1", "parent": "Spine", "index": 2},
        {"name": "Neck", "parent": "Spine1", "index": 3},
        {"name": "Head", "parent": "Neck", "index": 4},
        {"name": "LeftShoulder", "parent": "Spine1", "index": 5},
        {"name": "LeftArm", "parent": "LeftShoulder", "index": 6},
        {"name": "LeftForeArm", "parent": "LeftArm", "index": 7},
        {"name": "LeftHand", "parent": "LeftForeArm", "index": 8},
        {"name": "RightShoulder", "parent": "Spine1", "index": 9},
        {"name": "RightArm", "parent": "RightShoulder", "index": 10},
        {"name": "RightForeArm", "parent": "RightArm", "index": 11},
        {"name": "RightHand", "parent": "RightForeArm", "index": 12},
        {"name": "LeftUpLeg", "parent": "Hips", "index": 13},
        {"name": "LeftLeg", "parent": "LeftUpLeg", "index": 14},
        {"name": "LeftFoot", "parent": "LeftLeg", "index": 15},
        {"name": "RightUpLeg", "parent": "Hips", "index": 16},
        {"name": "RightLeg", "parent": "RightUpLeg", "index": 17},
        {"name": "RightFoot", "parent": "RightLeg", "index": 18},
    ]


def _generate_keyframes(
    joints: list[dict[str, Any]],
    frame_count: int,
    fps: float,
) -> list[dict[str, Any]]:
    """Generate simulated keyframe data for the given joints and frame count."""
    keyframes: list[dict[str, Any]] = []
    for i in range(frame_count):
        transforms: dict[str, dict[str, float]] = {}
        for joint in joints:
            # Simple sinusoidal motion for simulation
            t = i / fps if fps > 0 else 0
            transforms[joint["name"]] = {
                "rx": round(math.sin(t + joint["index"]) * 15.0, 3),
                "ry": round(math.cos(t + joint["index"]) * 10.0, 3),
                "rz": round(math.sin(t * 0.5 + joint["index"]) * 5.0, 3),
            }
        keyframes.append({
            "frame": i,
            "timestamp_ms": int((i / fps) * 1000) if fps > 0 else 0,
            "joint_transforms": transforms,
        })
    return keyframes


def _lerp_keyframe(
    kf_a: dict[str, Any],
    kf_b: dict[str, Any],
    t: float,
) -> dict[str, Any]:
    """Linearly interpolate joint transforms between two keyframes."""
    transforms_a: dict[str, dict[str, float]] = kf_a.get("joint_transforms", {})
    transforms_b: dict[str, dict[str, float]] = kf_b.get("joint_transforms", {})
    all_joints = set(transforms_a.keys()) | set(transforms_b.keys())

    blended: dict[str, dict[str, float]] = {}
    for joint_name in all_joints:
        a = transforms_a.get(joint_name, {"rx": 0, "ry": 0, "rz": 0})
        b = transforms_b.get(joint_name, {"rx": 0, "ry": 0, "rz": 0})
        blended[joint_name] = {
            "rx": round(a["rx"] * (1 - t) + b["rx"] * t, 3),
            "ry": round(a["ry"] * (1 - t) + b["ry"] * t, 3),
            "rz": round(a["rz"] * (1 - t) + b["rz"] * t, 3),
        }

    return {
        "frame": kf_a.get("frame", 0),
        "timestamp_ms": kf_a.get("timestamp_ms", 0),
        "joint_transforms": blended,
    }
