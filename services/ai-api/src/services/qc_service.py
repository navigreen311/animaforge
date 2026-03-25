"""Service layer for output quality-control validation."""

from __future__ import annotations


# Default thresholds used for pass/fail determination.
_THRESHOLDS = {
    "flicker_score": 0.05,       # lower is better; fail above this
    "identity_drift": 0.08,      # lower is better; fail above this
    "loudness_lufs": -14.0,      # target LUFS; fail if deviation > 2
    "artifact_count": 2,         # fail if more than this many
}


def validate_output(output_url: str, checks: list[str]) -> dict:
    """Run quality-control checks against a rendered output (mock).

    In production this would download the asset at *output_url* and run the
    requested analysis passes; for now it returns deterministic mock scores
    so the API contract is exercisable end-to-end.

    Returns a dict with ``report``, ``passed``, and ``issues`` keys.
    """
    report: dict[str, float | int | bool] = {}
    issues: list[str] = []

    # Populate report with mock passing values for each requested check.
    if "flicker" in checks:
        report["flicker_score"] = 0.02
    if "identity" in checks:
        report["identity_drift"] = 0.04
    if "loudness" in checks:
        report["loudness_lufs"] = -14.0
    if "artifacts" in checks:
        report["artifact_count"] = 0

    # Always include the overall pass flag.
    report["overall_pass"] = True

    # If no recognised checks were requested, flag an issue.
    if len(report) == 1 and "overall_pass" in report:
        issues.append("No recognised checks requested")
        report["overall_pass"] = False

    passed = bool(report.get("overall_pass", False))

    return {
        "report": report,
        "passed": passed,
        "issues": issues,
    }
