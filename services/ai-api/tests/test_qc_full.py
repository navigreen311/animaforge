"""Comprehensive tests for the full QC validation system."""

import pytest

from src.services.qc_service import (
    compute_artifact_score,
    compute_identity_drift,
    compute_lip_sync_offset,
    compute_loudness,
    compute_temporal_lpips,
    generate_qc_certificate,
    validate_output,
)


# -- 1. LPIPS computation --


def test_temporal_lpips_returns_expected_keys():
    result = compute_temporal_lpips("https://cdn.example.com/frames/job-001")
    assert "mean_lpips" in result
    assert "max_lpips" in result
    assert "frame_scores" in result
    assert "flicker_detected" in result
    # 23 pairs for 24 frames
    assert len(result["frame_scores"]) == 23
    assert result["mean_lpips"] >= 0.0
    assert result["max_lpips"] >= result["mean_lpips"]


# -- 2. Flicker detection --


def test_flicker_detection_deterministic():
    """Flicker flag must be True when max_lpips > 0.15."""
    result = compute_temporal_lpips("https://cdn.example.com/frames/job-001")
    if result["max_lpips"] > 0.15:
        assert result["flicker_detected"] is True
    else:
        assert result["flicker_detected"] is False

    # Same input always yields same output.
    result2 = compute_temporal_lpips("https://cdn.example.com/frames/job-001")
    assert result == result2


# -- 3. Identity drift detection --


def test_identity_drift_structure():
    result = compute_identity_drift(
        "char-ref-42", "https://cdn.example.com/frames/job-002"
    )
    assert "mean_similarity" in result
    assert "min_similarity" in result
    assert "drift_score" in result
    assert "frames_with_drift" in result
    assert isinstance(result["frames_with_drift"], list)
    # drift_score = 1 - min_similarity
    assert abs(result["drift_score"] - (1.0 - result["min_similarity"])) < 1e-3


# -- 4. Lip sync measurement --


def test_lip_sync_offset_quality_labels():
    result = compute_lip_sync_offset(
        "https://cdn.example.com/audio/a1.wav",
        "https://cdn.example.com/video/v1.mp4",
    )
    assert result["sync_quality"] in {"perfect", "acceptable", "poor"}
    assert 0 <= result["offset_ms"] <= 80
    assert 0.7 <= result["confidence"] <= 1.0

    if result["offset_ms"] <= 20:
        assert result["sync_quality"] == "perfect"
    elif result["offset_ms"] <= 50:
        assert result["sync_quality"] == "acceptable"
    else:
        assert result["sync_quality"] == "poor"


# -- 5. Artifact detection --


def test_artifact_score_types_valid():
    result = compute_artifact_score("https://cdn.example.com/frames/job-003")
    valid_types = {"compression", "banding", "aliasing", "ghosting", "morphing"}
    assert all(t in valid_types for t in result["artifact_types"])
    assert result["artifact_count"] == len(result["artifact_types"])
    assert len(result["severity_scores"]) == result["artifact_count"]
    if result["artifact_count"] > 0:
        assert 0 <= result["worst_frame"] < 24
    else:
        assert result["worst_frame"] == -1


# -- 6. Loudness check --


def test_loudness_compliance():
    result = compute_loudness("https://cdn.example.com/audio/a1.wav")
    assert "integrated_lufs" in result
    assert "true_peak" in result
    assert "loudness_range" in result
    assert "compliant" in result
    # Compliant if within +/- 2 of -14 LUFS
    expected_compliant = abs(result["integrated_lufs"] - (-14.0)) <= 2.0
    assert result["compliant"] == expected_compliant


# -- 7. Full validation pass --


def test_validate_output_all_checks():
    result = validate_output(
        "https://cdn.example.com/output/good-job",
        ["temporal_lpips", "identity_drift", "lip_sync", "artifacts", "loudness"],
    )
    assert "passed" in result
    assert "overall_score" in result
    assert "issues" in result
    assert "details" in result
    assert isinstance(result["overall_score"], float)
    assert 0.0 <= result["overall_score"] <= 1.0
    # All five checks should appear in details
    assert len(result["details"]) == 5


# -- 8. Full validation fail --


def test_validate_output_fails_with_issues():
    """When issues are present, passed must be False regardless of score."""
    result = validate_output(
        "https://cdn.example.com/output/good-job",
        ["temporal_lpips", "identity_drift", "lip_sync", "artifacts", "loudness"],
    )
    if result["issues"]:
        assert result["passed"] is False


# -- 9. Certificate generation --


def test_qc_certificate_structure():
    report = validate_output(
        "https://cdn.example.com/output/cert-test",
        ["temporal_lpips", "loudness"],
    )
    cert = generate_qc_certificate("job-cert-001", report)
    assert "certificate_id" in cert
    assert cert["job_id"] == "job-cert-001"
    assert "timestamp" in cert
    assert "signature" in cert
    assert isinstance(cert["signature"], str) and len(cert["signature"]) == 64
    assert cert["overall_score"] == report["overall_score"]
    assert cert["passed"] == report["passed"]


# -- 10. Empty checks --


def test_validate_output_empty_checks():
    result = validate_output("https://cdn.example.com/output/empty", [])
    assert result["overall_score"] == 0.0
    assert result["passed"] is False
    assert result["details"] == {}


# -- 11. Partial checks --


def test_validate_output_partial_checks():
    result = validate_output(
        "https://cdn.example.com/output/partial",
        ["loudness"],
    )
    assert "loudness" in result["details"]
    assert len(result["details"]) == 1
    assert result["overall_score"] > 0.0


# -- 12. Edge cases --


def test_unknown_check_name_recorded_as_issue():
    result = validate_output(
        "https://cdn.example.com/output/edge",
        ["temporal_lpips", "nonexistent_check"],
    )
    assert any("Unknown check" in issue for issue in result["issues"])
    # Only the valid check should appear in details
    assert "temporal_lpips" in result["details"]
    assert "nonexistent_check" not in result["details"]
