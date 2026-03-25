"""Service layer for output quality-control validation.

Provides temporal LPIPS, identity drift, lip-sync offset, artifact
detection, loudness analysis, aggregate validation, and QC certificate
generation.  All heavy computations are simulated with deterministic
mocks so the API contract is exercisable end-to-end before real model
weights are wired in.
"""

from __future__ import annotations

import hashlib
import time
import uuid
from typing import Any

# ---------------------------------------------------------------------------
# Thresholds
# ---------------------------------------------------------------------------

_THRESHOLDS = {
    "max_lpips": 0.15,
    "min_identity_sim": 0.85,
    "lip_sync_poor_ms": 50,
    "loudness_target_lufs": -14.0,
    "loudness_tolerance": 2.0,
    "overall_pass": 0.8,
}

# ---------------------------------------------------------------------------
# Individual QC functions
# ---------------------------------------------------------------------------


def compute_temporal_lpips(frames_url: str) -> dict[str, Any]:
    """Simulate LPIPS between consecutive frames.

    Returns mean/max LPIPS, per-frame scores, and flicker flag.
    """
    seed = int(hashlib.sha256(frames_url.encode()).hexdigest(), 16)

    num_frames = 24
    frame_scores: list[float] = []
    for i in range(num_frames - 1):
        raw = ((seed >> (i % 64)) & 0xFF) / 255.0
        score = round(0.01 + raw * 0.11, 4)
        frame_scores.append(score)

    mean_lpips = round(sum(frame_scores) / len(frame_scores), 4)
    max_lpips = round(max(frame_scores), 4)
    flicker_detected = max_lpips > _THRESHOLDS["max_lpips"]

    return {
        "mean_lpips": mean_lpips,
        "max_lpips": max_lpips,
        "frame_scores": frame_scores,
        "flicker_detected": flicker_detected,
    }


def compute_identity_drift(
    character_ref: str,
    frames_url: str,
) -> dict[str, Any]:
    """Simulate face-identity comparison across frames.

    Returns mean/min similarity, drift score, and frames with drift.
    """
    seed = int(
        hashlib.sha256(
            f"{character_ref}:{frames_url}".encode(),
        ).hexdigest(),
        16,
    )

    num_frames = 24
    similarities: list[float] = []
    frames_with_drift: list[int] = []

    for i in range(num_frames):
        raw = ((seed >> (i % 64)) & 0xFF) / 255.0
        sim = round(0.82 + raw * 0.17, 4)
        similarities.append(sim)
        if sim < _THRESHOLDS["min_identity_sim"]:
            frames_with_drift.append(i)

    mean_similarity = round(sum(similarities) / len(similarities), 4)
    min_similarity = round(min(similarities), 4)
    drift_score = round(1.0 - min_similarity, 4)

    return {
        "mean_similarity": mean_similarity,
        "min_similarity": min_similarity,
        "drift_score": drift_score,
        "frames_with_drift": frames_with_drift,
    }


def compute_lip_sync_offset(
    audio_url: str,
    video_url: str,
) -> dict[str, Any]:
    """Simulate A/V sync measurement.

    Returns offset in ms, confidence, and qualitative sync quality.
    """
    seed = int(
        hashlib.sha256(
            f"{audio_url}:{video_url}".encode(),
        ).hexdigest(),
        16,
    )

    offset_ms = round(((seed & 0xFFFF) / 0xFFFF) * 80, 1)
    confidence = round(0.7 + ((seed >> 16) & 0xFF) / 255.0 * 0.3, 4)

    if offset_ms <= 20:
        sync_quality = "perfect"
    elif offset_ms <= _THRESHOLDS["lip_sync_poor_ms"]:
        sync_quality = "acceptable"
    else:
        sync_quality = "poor"

    return {
        "offset_ms": offset_ms,
        "confidence": confidence,
        "sync_quality": sync_quality,
    }


_ARTIFACT_TYPES = [
    "compression",
    "banding",
    "aliasing",
    "ghosting",
    "morphing",
]


def compute_artifact_score(frames_url: str) -> dict[str, Any]:
    """Detect visual artifacts in rendered frames.

    Returns count, types, severity scores, and worst frame index.
    """
    seed = int(hashlib.sha256(frames_url.encode()).hexdigest(), 16)

    detected_types: list[str] = []
    severity_scores: list[float] = []

    for idx, art_type in enumerate(_ARTIFACT_TYPES):
        val = ((seed >> (idx * 8)) & 0xFF) / 255.0
        if val > 0.5:
            detected_types.append(art_type)
            severity_scores.append(round(val, 4))

    artifact_count = len(detected_types)
    worst_frame = (seed & 0xFF) % 24 if artifact_count > 0 else -1

    return {
        "artifact_count": artifact_count,
        "artifact_types": detected_types,
        "severity_scores": severity_scores,
        "worst_frame": worst_frame,
    }


def compute_loudness(audio_url: str) -> dict[str, Any]:
    """Simulate integrated loudness analysis.

    Returns LUFS, true peak, loudness range, and compliance flag.
    Target: -14 LUFS for streaming.
    """
    seed = int(hashlib.sha256(audio_url.encode()).hexdigest(), 16)

    integrated_lufs = round(
        -16.0 + ((seed & 0xFFFF) / 0xFFFF) * 4.0,
        1,
    )
    true_peak = round(
        -3.0 + ((seed >> 16) & 0xFF) / 255.0 * 4.0,
        1,
    )
    loudness_range = round(
        3.0 + ((seed >> 24) & 0xFF) / 255.0 * 9.0,
        1,
    )

    target = _THRESHOLDS["loudness_target_lufs"]
    tolerance = _THRESHOLDS["loudness_tolerance"]
    compliant = abs(integrated_lufs - target) <= tolerance

    return {
        "integrated_lufs": integrated_lufs,
        "true_peak": true_peak,
        "loudness_range": loudness_range,
        "compliant": compliant,
    }


# ---------------------------------------------------------------------------
# Aggregate validation
# ---------------------------------------------------------------------------

_CHECK_DISPATCH = {
    "temporal_lpips": lambda urls: compute_temporal_lpips(urls["frames_url"]),
    "identity_drift": lambda urls: compute_identity_drift(
        urls.get("character_ref", "default"),
        urls["frames_url"],
    ),
    "lip_sync": lambda urls: compute_lip_sync_offset(
        urls["audio_url"],
        urls["video_url"],
    ),
    "artifacts": lambda urls: compute_artifact_score(urls["frames_url"]),
    "loudness": lambda urls: compute_loudness(urls["audio_url"]),
}


def _score_check(name: str, result: dict) -> float:
    """Derive a 0-1 quality score from a single check result."""
    if name == "temporal_lpips":
        return max(0.0, 1.0 - result["mean_lpips"] / 0.15)
    if name == "identity_drift":
        return max(0.0, min(1.0, result["min_similarity"]))
    if name == "lip_sync":
        return {"perfect": 1.0, "acceptable": 0.75, "poor": 0.3}.get(
            result["sync_quality"],
            0.0,
        )
    if name == "artifacts":
        return max(0.0, 1.0 - result["artifact_count"] / 5.0)
    if name == "loudness":
        return 1.0 if result["compliant"] else 0.4
    return 1.0


def validate_output(
    output_url: str,
    checks: list[str],
    *,
    character_ref: str = "default",
) -> dict[str, Any]:
    """Run selected QC checks and aggregate results.

    *checks* should contain zero or more of:
    ``temporal_lpips``, ``identity_drift``, ``lip_sync``, ``artifacts``,
    ``loudness``.

    Returns a report dict with ``passed``, ``overall_score``, ``issues``,
    and per-check ``details``.
    """
    urls = {
        "frames_url": output_url,
        "audio_url": output_url,
        "video_url": output_url,
        "character_ref": character_ref,
    }

    details: dict[str, Any] = {}
    issues: list[str] = []
    scores: list[float] = []

    for check_name in checks:
        dispatcher = _CHECK_DISPATCH.get(check_name)
        if dispatcher is None:
            issues.append(f"Unknown check: {check_name}")
            continue
        result = dispatcher(urls)
        details[check_name] = result
        score = _score_check(check_name, result)
        scores.append(score)

        if check_name == "temporal_lpips" and result["flicker_detected"]:
            issues.append("Flicker detected in frame sequence")
        if check_name == "identity_drift" and result["frames_with_drift"]:
            issues.append(
                f"Identity drift in {len(result['frames_with_drift'])} frame(s)",
            )
        if check_name == "lip_sync" and result["sync_quality"] == "poor":
            issues.append(
                f"Poor lip sync (offset {result['offset_ms']} ms)",
            )
        if check_name == "artifacts" and result["artifact_count"] > 2:
            issues.append(
                f"{result['artifact_count']} artifacts detected",
            )
        if check_name == "loudness" and not result["compliant"]:
            issues.append(
                f"Loudness non-compliant ({result['integrated_lufs']} LUFS)",
            )

    overall_score = (
        round(sum(scores) / len(scores), 4) if scores else 0.0
    )
    passed = overall_score >= _THRESHOLDS["overall_pass"] and len(issues) == 0

    return {
        "report": {
            "output_url": output_url,
            "checks_run": list(details.keys()),
        },
        "passed": passed,
        "overall_score": overall_score,
        "issues": issues,
        "details": details,
    }


# ---------------------------------------------------------------------------
# QC Certificate
# ---------------------------------------------------------------------------


def generate_qc_certificate(
    job_id: str,
    report: dict[str, Any],
) -> dict[str, Any]:
    """Create a signed QC certificate for a completed validation run.

    The certificate contains a deterministic signature derived from the
    job ID and report payload so consumers can verify provenance.
    """
    timestamp = time.time()
    cert_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"qc:{job_id}:{timestamp}"))

    payload = (
        f"{job_id}:{report.get('overall_score', 0)}:{report.get('passed', False)}"
    )
    signature = hashlib.sha256(payload.encode()).hexdigest()

    return {
        "certificate_id": cert_id,
        "job_id": job_id,
        "timestamp": timestamp,
        "overall_score": report.get("overall_score", 0),
        "passed": report.get("passed", False),
        "checks_run": report.get("report", {}).get("checks_run", []),
        "issues": report.get("issues", []),
        "signature": signature,
    }
