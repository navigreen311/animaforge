"""Advanced ML-based QC metrics for AnimaForge output validation.

Extends the basic qc_service.py with FID scoring, uncanny valley detection,
motion quality analysis, aesthetic scoring, color consistency, and detailed
audio-visual sync.  All computations use deterministic mocks keyed on input
hashes so the API contract is exercisable end-to-end before real model
weights are integrated.
"""

from __future__ import annotations

import hashlib
import math
import time
import uuid
from typing import Any

# ---------------------------------------------------------------------------
# Grade thresholds
# ---------------------------------------------------------------------------

_GRADE_THRESHOLDS = {
    "A": 0.95,
    "B": 0.85,
    "C": 0.75,
    "D": 0.60,
}


def _letter_grade(score: float) -> str:
    """Map a 0-1 score to a letter grade."""
    if score >= _GRADE_THRESHOLDS["A"]:
        return "A"
    if score >= _GRADE_THRESHOLDS["B"]:
        return "B"
    if score >= _GRADE_THRESHOLDS["C"]:
        return "C"
    if score >= _GRADE_THRESHOLDS["D"]:
        return "D"
    return "F"


def _auto_action(grade: str) -> str:
    """Determine automatic action based on grade."""
    if grade in ("A", "B"):
        return "approve"
    if grade == "C":
        return "manual_review"
    return "reject"


def _seed_from(*parts: str) -> int:
    """Create a deterministic integer seed from string parts."""
    combined = ":".join(parts)
    return int(hashlib.sha256(combined.encode()).hexdigest(), 16)


# ---------------------------------------------------------------------------
# Individual ML-based QC metrics
# ---------------------------------------------------------------------------


def compute_fid_score(
    generated_frames: list[str],
    reference_frames: list[str],
) -> dict[str, Any]:
    """Compute Frechet Inception Distance between generated and reference sets.

    Mock: deterministic score based on frame counts and content hashes.
    Lower FID is better; mapped to a 0-1 quality score.
    """
    gen_count = len(generated_frames)
    ref_count = len(reference_frames)
    seed = _seed_from(
        str(gen_count), str(ref_count),
        *(generated_frames[:3]),
        *(reference_frames[:3]),
    )

    # FID in range [5, 120] -- lower is better
    raw = ((seed & 0xFFFF) / 0xFFFF)
    fid_score = round(5.0 + raw * 115.0, 2)

    # Adjust by frame count similarity (closer counts = better score)
    count_ratio = min(gen_count, ref_count) / max(gen_count, ref_count) if max(gen_count, ref_count) > 0 else 0
    fid_score = round(fid_score * (2.0 - count_ratio), 2)

    # Map FID to 0-1 quality (FID=0 -> 1.0, FID>=200 -> 0.0)
    quality = round(max(0.0, 1.0 - fid_score / 200.0), 4)
    grade = _letter_grade(quality)

    return {
        "fid_score": fid_score,
        "quality_grade": grade,
        "quality_score": quality,
        "generated_count": gen_count,
        "reference_count": ref_count,
    }


def compute_temporal_consistency(
    frames: list[str],
) -> dict[str, Any]:
    """Measure frame-to-frame consistency beyond LPIPS.

    Analyses structural similarity, color histogram shifts, and edge
    coherence across consecutive frame pairs.
    """
    if len(frames) < 2:
        return {
            "consistency_score": 1.0,
            "jitter_frames": [],
            "smoothness_grade": "A",
        }

    seed = _seed_from(*frames[:5], str(len(frames)))
    num_pairs = len(frames) - 1
    jitter_frames: list[int] = []
    pair_scores: list[float] = []

    for i in range(num_pairs):
        raw = ((seed >> (i % 64)) & 0xFF) / 255.0
        score = round(0.80 + raw * 0.20, 4)  # per-pair consistency [0.80, 1.0]
        pair_scores.append(score)
        if score < 0.85:
            jitter_frames.append(i)

    consistency_score = round(sum(pair_scores) / len(pair_scores), 4)
    smoothness_grade = _letter_grade(consistency_score)

    return {
        "consistency_score": consistency_score,
        "jitter_frames": jitter_frames,
        "smoothness_grade": smoothness_grade,
    }


def compute_aesthetic_score(frame: str) -> dict[str, Any]:
    """Predict aesthetic quality of a single frame.

    Mock scores for composition, color harmony, and lighting quality.
    """
    seed = _seed_from(frame)

    composition = round(0.5 + ((seed & 0xFFFF) / 0xFFFF) * 0.5, 4)
    color_score = round(0.5 + (((seed >> 16) & 0xFFFF) / 0xFFFF) * 0.5, 4)
    lighting = round(0.5 + (((seed >> 32) & 0xFFFF) / 0xFFFF) * 0.5, 4)
    overall = round((composition + color_score + lighting) / 3.0, 4)

    return {
        "score": overall,
        "composition_score": composition,
        "color_score": color_score,
        "lighting_score": lighting,
    }


def detect_uncanny_valley(
    face_frames: list[str],
) -> dict[str, Any]:
    """Classify frames for human-likeness / uncanny valley effect.

    Returns a human-likeness score (0-1, higher=more natural) and flags
    frames that fall into the uncanny valley range (0.4-0.7).
    """
    if not face_frames:
        return {
            "human_likeness_score": 1.0,
            "uncanny_detected": False,
            "problematic_frames": [],
        }

    seed = _seed_from(*face_frames[:5], str(len(face_frames)))
    per_frame_scores: list[float] = []
    problematic: list[int] = []

    for i, frame in enumerate(face_frames):
        fseed = _seed_from(frame, str(i))
        raw = ((fseed & 0xFFFF) / 0xFFFF)
        # Score in [0.3, 1.0]
        likeness = round(0.3 + raw * 0.7, 4)
        per_frame_scores.append(likeness)
        # Uncanny valley zone: scores between 0.4 and 0.7
        if 0.4 <= likeness <= 0.7:
            problematic.append(i)

    mean_likeness = round(sum(per_frame_scores) / len(per_frame_scores), 4)
    uncanny = len(problematic) > 0

    return {
        "human_likeness_score": mean_likeness,
        "uncanny_detected": uncanny,
        "problematic_frames": problematic,
    }


def compute_motion_quality(
    frames: list[str],
) -> dict[str, Any]:
    """Analyse motion smoothness and physics plausibility across frames.

    Evaluates acceleration consistency, jerk minimisation, and simulated
    physics plausibility.
    """
    if len(frames) < 3:
        return {
            "smoothness": 1.0,
            "acceleration_consistency": 1.0,
            "physics_plausibility": 1.0,
            "jerky_segments": [],
        }

    seed = _seed_from(*frames[:5], str(len(frames)))
    num_segments = len(frames) - 2  # need 3 consecutive frames per segment
    jerky: list[dict[str, Any]] = []
    smoothness_vals: list[float] = []
    accel_vals: list[float] = []

    for i in range(num_segments):
        raw_s = ((seed >> (i % 64)) & 0xFF) / 255.0
        raw_a = ((seed >> ((i + 7) % 64)) & 0xFF) / 255.0
        s = round(0.75 + raw_s * 0.25, 4)
        a = round(0.70 + raw_a * 0.30, 4)
        smoothness_vals.append(s)
        accel_vals.append(a)
        if s < 0.80:
            jerky.append({"segment_start": i, "segment_end": i + 2, "severity": round(1.0 - s, 4)})

    smoothness = round(sum(smoothness_vals) / len(smoothness_vals), 4)
    accel_consistency = round(sum(accel_vals) / len(accel_vals), 4)

    # Physics plausibility: combine smoothness and acceleration
    physics = round((smoothness * 0.6 + accel_consistency * 0.4), 4)

    return {
        "smoothness": smoothness,
        "acceleration_consistency": accel_consistency,
        "physics_plausibility": physics,
        "jerky_segments": jerky,
    }


def compute_audio_visual_sync(
    video_url: str,
    audio_url: str,
) -> dict[str, Any]:
    """Detailed audio-visual synchronisation analysis.

    Measures offset, drift rate, and per-segment sync quality.
    """
    seed = _seed_from(video_url, audio_url)

    # Overall offset in ms [-40, +40]
    raw_offset = ((seed & 0xFFFF) / 0xFFFF)
    offset_ms = round(-40.0 + raw_offset * 80.0, 2)

    # Drift rate ms per second [-2, +2]
    raw_drift = (((seed >> 16) & 0xFFFF) / 0xFFFF)
    drift_rate = round(-2.0 + raw_drift * 4.0, 3)

    # Generate per-segment analysis (10 segments of ~1s each)
    segments: list[dict[str, Any]] = []
    for i in range(10):
        seg_seed = ((seed >> ((i * 3) % 64)) & 0xFF) / 255.0
        seg_offset = round(offset_ms + drift_rate * i + (seg_seed - 0.5) * 10, 2)
        segments.append({
            "segment_index": i,
            "time_start_s": i,
            "time_end_s": i + 1,
            "offset_ms": seg_offset,
            "quality": "good" if abs(seg_offset) <= 25 else ("acceptable" if abs(seg_offset) <= 50 else "poor"),
        })

    # Overall quality from absolute offset and drift
    quality_score = max(0.0, 1.0 - (abs(offset_ms) / 80.0 + abs(drift_rate) / 4.0) / 2.0)
    if quality_score >= 0.85:
        overall = "excellent"
    elif quality_score >= 0.65:
        overall = "good"
    elif quality_score >= 0.45:
        overall = "acceptable"
    else:
        overall = "poor"

    return {
        "offset_ms": offset_ms,
        "drift_rate_ms_per_sec": drift_rate,
        "sync_segments": segments,
        "overall_quality": overall,
    }


def compute_color_consistency(
    frames: list[str],
) -> dict[str, Any]:
    """Check color grading consistency across frames.

    Detects color shifts and white balance drift between consecutive frames.
    """
    if len(frames) < 2:
        return {
            "consistency_score": 1.0,
            "color_shifts": [],
            "white_balance_drift": 0.0,
        }

    seed = _seed_from(*frames[:5], str(len(frames)))
    shifts: list[dict[str, Any]] = []
    shift_magnitudes: list[float] = []

    for i in range(len(frames) - 1):
        raw = ((seed >> (i % 64)) & 0xFF) / 255.0
        magnitude = round(raw * 0.15, 4)  # shift magnitude [0, 0.15]
        shift_magnitudes.append(magnitude)
        if magnitude > 0.08:
            # Determine dominant shift channel
            channel_seed = ((seed >> ((i + 13) % 64)) & 0xFF) % 3
            channel = ["red", "green", "blue"][channel_seed]
            shifts.append({
                "frame_pair": [i, i + 1],
                "magnitude": magnitude,
                "dominant_channel": channel,
            })

    mean_shift = sum(shift_magnitudes) / len(shift_magnitudes)
    consistency = round(max(0.0, 1.0 - mean_shift / 0.15), 4)

    # White balance drift: accumulated shift over all frames
    wb_drift = round(sum(shift_magnitudes) / len(shift_magnitudes) * 100, 2)

    return {
        "consistency_score": consistency,
        "color_shifts": shifts,
        "white_balance_drift": wb_drift,
    }


# ---------------------------------------------------------------------------
# Comprehensive QC pipeline
# ---------------------------------------------------------------------------


def run_comprehensive_qc(
    job_id: str,
    output_url: str,
) -> dict[str, Any]:
    """Run ALL ML-based QC metrics and aggregate into a single report.

    Produces an overall score, letter grade, pass/fail, per-metric
    breakdown, issue list, and a QC certificate.
    """
    # Simulate frame/resource URLs derived from the output
    frames = [f"{output_url}/frame_{i:04d}.png" for i in range(24)]
    face_frames = [f"{output_url}/face_{i:04d}.png" for i in range(12)]
    reference_frames = [f"{output_url}/ref_{i:04d}.png" for i in range(24)]
    video_url = f"{output_url}/video.mp4"
    audio_url = f"{output_url}/audio.wav"

    # Run all metrics
    fid = compute_fid_score(frames, reference_frames)
    temporal = compute_temporal_consistency(frames)
    aesthetic = compute_aesthetic_score(f"{output_url}/keyframe.png")
    uncanny = detect_uncanny_valley(face_frames)
    motion = compute_motion_quality(frames)
    av_sync = compute_audio_visual_sync(video_url, audio_url)
    color = compute_color_consistency(frames)

    metrics = {
        "fid": fid,
        "temporal_consistency": temporal,
        "aesthetic": aesthetic,
        "uncanny_valley": uncanny,
        "motion_quality": motion,
        "audio_visual_sync": av_sync,
        "color_consistency": color,
    }

    # Compute individual normalised scores for aggregation
    scores = {
        "fid": fid["quality_score"],
        "temporal_consistency": temporal["consistency_score"],
        "aesthetic": aesthetic["score"],
        "uncanny_valley": uncanny["human_likeness_score"],
        "motion_quality": motion["physics_plausibility"],
        "audio_visual_sync": max(0.0, 1.0 - (abs(av_sync["offset_ms"]) / 80.0 + abs(av_sync["drift_rate_ms_per_sec"]) / 4.0) / 2.0),
        "color_consistency": color["consistency_score"],
    }

    overall_score = round(sum(scores.values()) / len(scores), 4)
    grade = _letter_grade(overall_score)
    action = _auto_action(grade)

    # Collect issues
    issues: list[str] = []
    if fid["quality_grade"] in ("D", "F"):
        issues.append(f"High FID score ({fid['fid_score']}): generated frames diverge from reference")
    if temporal["jitter_frames"]:
        issues.append(f"Temporal jitter detected in {len(temporal['jitter_frames'])} frame pair(s)")
    if aesthetic["score"] < 0.7:
        issues.append(f"Low aesthetic score ({aesthetic['score']})")
    if uncanny["uncanny_detected"]:
        issues.append(f"Uncanny valley detected in {len(uncanny['problematic_frames'])} frame(s)")
    if motion["jerky_segments"]:
        issues.append(f"Jerky motion in {len(motion['jerky_segments'])} segment(s)")
    if av_sync["overall_quality"] in ("poor",):
        issues.append(f"Poor audio-visual sync (offset {av_sync['offset_ms']}ms, drift {av_sync['drift_rate_ms_per_sec']}ms/s)")
    if color["color_shifts"]:
        issues.append(f"Color shifts detected in {len(color['color_shifts'])} frame pair(s)")

    # Feedback for rejected outputs
    feedback: list[str] = []
    if action == "reject":
        if fid["quality_grade"] in ("D", "F"):
            feedback.append("Regenerate with closer adherence to reference style")
        if uncanny["uncanny_detected"]:
            feedback.append("Refine facial features to reduce uncanny valley effect")
        if motion["jerky_segments"]:
            feedback.append("Apply motion smoothing to jerky segments")
        if av_sync["overall_quality"] == "poor":
            feedback.append("Re-sync audio track with video")
        if not feedback:
            feedback.append("Overall quality below threshold; consider regeneration")

    # Certificate
    timestamp = time.time()
    cert_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"ml-qc:{job_id}:{overall_score}"))
    payload = f"{job_id}:{overall_score}:{grade}"
    signature = hashlib.sha256(payload.encode()).hexdigest()

    certificate = {
        "certificate_id": cert_id,
        "job_id": job_id,
        "timestamp": timestamp,
        "signature": signature,
    }

    return {
        "job_id": job_id,
        "output_url": output_url,
        "overall_score": overall_score,
        "grade": grade,
        "pass": action != "reject",
        "action": action,
        "metrics": metrics,
        "scores": scores,
        "issues": issues,
        "feedback": feedback,
        "certificate": certificate,
    }
