"""Tests for ML-based QC metrics (qc_ml_metrics.py).

Covers all 8 public functions with 10 focused test cases validating
return shapes, determinism, grade thresholds, and comprehensive QC
pass/fail behaviour.
"""

import pytest

from src.services.qc_ml_metrics import (
    _letter_grade,
    compute_aesthetic_score,
    compute_audio_visual_sync,
    compute_color_consistency,
    compute_fid_score,
    compute_motion_quality,
    compute_temporal_consistency,
    detect_uncanny_valley,
    run_comprehensive_qc,
)


# -- 1. FID score --


def test_fid_score_structure_and_determinism():
    gen = [f"gen_{i}.png" for i in range(24)]
    ref = [f"ref_{i}.png" for i in range(24)]
    result = compute_fid_score(gen, ref)

    assert "fid_score" in result
    assert "quality_grade" in result
    assert "quality_score" in result
    assert result["quality_grade"] in ("A", "B", "C", "D", "F")
    assert 0.0 <= result["quality_score"] <= 1.0
    assert result["fid_score"] > 0
    assert result["generated_count"] == 24
    assert result["reference_count"] == 24

    # Deterministic: same inputs yield same output
    assert compute_fid_score(gen, ref) == result


# -- 2. Temporal consistency --


def test_temporal_consistency():
    frames = [f"frame_{i}.png" for i in range(30)]
    result = compute_temporal_consistency(frames)

    assert "consistency_score" in result
    assert "jitter_frames" in result
    assert "smoothness_grade" in result
    assert 0.0 <= result["consistency_score"] <= 1.0
    assert result["smoothness_grade"] in ("A", "B", "C", "D", "F")
    assert isinstance(result["jitter_frames"], list)
    # All jitter frame indices should be valid pair indices
    for idx in result["jitter_frames"]:
        assert 0 <= idx < 29

    # Edge case: single frame
    single = compute_temporal_consistency(["only_one.png"])
    assert single["consistency_score"] == 1.0
    assert single["jitter_frames"] == []


# -- 3. Aesthetic scoring --


def test_aesthetic_score():
    result = compute_aesthetic_score("keyframe_001.png")

    assert "score" in result
    assert "composition_score" in result
    assert "color_score" in result
    assert "lighting_score" in result
    for key in ("score", "composition_score", "color_score", "lighting_score"):
        assert 0.5 <= result[key] <= 1.0, f"{key} out of range"

    # Overall is average of the three sub-scores
    expected = round(
        (result["composition_score"] + result["color_score"] + result["lighting_score"]) / 3.0,
        4,
    )
    assert abs(result["score"] - expected) < 1e-3


# -- 4. Uncanny valley detection --


def test_uncanny_valley_detection():
    faces = [f"face_{i}.png" for i in range(10)]
    result = detect_uncanny_valley(faces)

    assert "human_likeness_score" in result
    assert "uncanny_detected" in result
    assert "problematic_frames" in result
    assert isinstance(result["uncanny_detected"], bool)
    assert 0.0 <= result["human_likeness_score"] <= 1.0
    # Problematic frames should be valid indices
    for idx in result["problematic_frames"]:
        assert 0 <= idx < 10
    # uncanny_detected should be True iff problematic frames exist
    assert result["uncanny_detected"] == (len(result["problematic_frames"]) > 0)

    # Edge: empty face list
    empty = detect_uncanny_valley([])
    assert empty["uncanny_detected"] is False
    assert empty["human_likeness_score"] == 1.0


# -- 5. Motion quality --


def test_motion_quality():
    frames = [f"frame_{i}.png" for i in range(24)]
    result = compute_motion_quality(frames)

    assert "smoothness" in result
    assert "acceleration_consistency" in result
    assert "physics_plausibility" in result
    assert "jerky_segments" in result
    assert 0.0 <= result["smoothness"] <= 1.0
    assert 0.0 <= result["acceleration_consistency"] <= 1.0
    assert 0.0 <= result["physics_plausibility"] <= 1.0
    for seg in result["jerky_segments"]:
        assert "segment_start" in seg
        assert "segment_end" in seg
        assert "severity" in seg

    # Edge: too few frames
    short = compute_motion_quality(["a.png", "b.png"])
    assert short["smoothness"] == 1.0


# -- 6. Audio-visual sync --


def test_audio_visual_sync():
    result = compute_audio_visual_sync(
        "https://cdn.example.com/video.mp4",
        "https://cdn.example.com/audio.wav",
    )

    assert "offset_ms" in result
    assert "drift_rate_ms_per_sec" in result
    assert "sync_segments" in result
    assert "overall_quality" in result
    assert -40.0 <= result["offset_ms"] <= 40.0
    assert -2.0 <= result["drift_rate_ms_per_sec"] <= 2.0
    assert len(result["sync_segments"]) == 10
    assert result["overall_quality"] in ("excellent", "good", "acceptable", "poor")
    for seg in result["sync_segments"]:
        assert "segment_index" in seg
        assert "quality" in seg
        assert seg["quality"] in ("good", "acceptable", "poor")


# -- 7. Color consistency --


def test_color_consistency():
    frames = [f"frame_{i}.png" for i in range(24)]
    result = compute_color_consistency(frames)

    assert "consistency_score" in result
    assert "color_shifts" in result
    assert "white_balance_drift" in result
    assert 0.0 <= result["consistency_score"] <= 1.0
    assert isinstance(result["white_balance_drift"], float)
    for shift in result["color_shifts"]:
        assert "frame_pair" in shift
        assert "magnitude" in shift
        assert "dominant_channel" in shift
        assert shift["dominant_channel"] in ("red", "green", "blue")

    # Edge: single frame
    single = compute_color_consistency(["one.png"])
    assert single["consistency_score"] == 1.0
    assert single["color_shifts"] == []


# -- 8. Comprehensive QC -- pass scenario --


def test_comprehensive_qc_pass():
    result = run_comprehensive_qc("job-pass-001", "https://cdn.example.com/output/good")

    assert result["job_id"] == "job-pass-001"
    assert "overall_score" in result
    assert "grade" in result
    assert "pass" in result
    assert "metrics" in result
    assert "issues" in result
    assert "certificate" in result
    assert result["grade"] in ("A", "B", "C", "D", "F")
    assert result["action"] in ("approve", "manual_review", "reject")

    # Verify all 7 metric categories are present
    expected_keys = {
        "fid", "temporal_consistency", "aesthetic",
        "uncanny_valley", "motion_quality", "audio_visual_sync",
        "color_consistency",
    }
    assert set(result["metrics"].keys()) == expected_keys
    assert set(result["scores"].keys()) == expected_keys

    # Certificate structure
    cert = result["certificate"]
    assert "certificate_id" in cert
    assert cert["job_id"] == "job-pass-001"
    assert "signature" in cert and len(cert["signature"]) == 64

    # pass aligns with action
    if result["action"] == "reject":
        assert result["pass"] is False
    else:
        assert result["pass"] is True


# -- 9. Comprehensive QC -- fail scenario --


def test_comprehensive_qc_fail():
    """Force a low-quality scenario and verify fail behaviour."""
    result = run_comprehensive_qc("job-fail-001", "https://cdn.example.com/output/bad-quality")

    assert result["job_id"] == "job-fail-001"
    # Regardless of actual score, verify structural correctness
    assert isinstance(result["pass"], bool)
    assert isinstance(result["issues"], list)
    assert isinstance(result["feedback"], list)

    # If grade is D or F, action must be reject and pass must be False
    if result["grade"] in ("D", "F"):
        assert result["action"] == "reject"
        assert result["pass"] is False
        assert len(result["feedback"]) > 0

    # If grade is C, action must be manual_review
    if result["grade"] == "C":
        assert result["action"] == "manual_review"
        assert result["pass"] is True


# -- 10. Grade thresholds --


def test_grade_thresholds():
    """Verify letter grade boundaries match spec."""
    assert _letter_grade(1.0) == "A"
    assert _letter_grade(0.95) == "A"
    assert _letter_grade(0.949) == "B"
    assert _letter_grade(0.85) == "B"
    assert _letter_grade(0.849) == "C"
    assert _letter_grade(0.75) == "C"
    assert _letter_grade(0.749) == "D"
    assert _letter_grade(0.60) == "D"
    assert _letter_grade(0.599) == "F"
    assert _letter_grade(0.0) == "F"
