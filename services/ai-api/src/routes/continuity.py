"""Cross-shot continuity checking routes (Engine E6)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.continuity_service import (
    generate_continuity_report,
    suggest_fixes,
)

router = APIRouter(prefix="/ai/v1")


# ── Request / response models ───────────────────────────────────────────────


class ContinuityCheckRequest(BaseModel):
    project_id: str
    shot_ids: list[str]
    shots: list[dict] = []


class ContinuityFixRequest(BaseModel):
    project_id: str
    issue_id: str
    auto_fix: bool = False


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/continuity/check")
async def continuity_check(body: ContinuityCheckRequest) -> dict:
    """Run full continuity analysis across the supplied shots.

    Expects ``shots`` to be a list of dicts with keys such as
    ``shot_id``, ``character_ref``, ``style_ref``, ``characters``,
    ``audio_level_db``, and optionally ``is_cut``.
    """
    if not body.shots:
        return {
            "project_id": body.project_id,
            "shot_ids": body.shot_ids,
            "overall_score": 1.0,
            "issues": [],
            "warnings": ["No shot data provided — nothing to check."],
            "character_consistency": 1.0,
            "style_consistency": 1.0,
            "temporal_score": 1.0,
            "audio_score": 1.0,
        }

    report = generate_continuity_report(
        project_id=body.project_id,
        shot_ids=body.shot_ids,
        shots=body.shots,
    )
    report["fixes"] = suggest_fixes(report["issues"])
    return report


@router.post("/continuity/fix")
async def continuity_fix(body: ContinuityFixRequest) -> dict:
    """Apply a suggested fix or return manual instructions.

    In production this would trigger a re-generation job; for now it
    returns mock confirmation or manual instructions.
    """
    if not body.issue_id:
        raise HTTPException(status_code=400, detail="issue_id is required")

    if body.auto_fix:
        return {
            "project_id": body.project_id,
            "issue_id": body.issue_id,
            "status": "fix_applied",
            "message": (
                f"Auto-fix applied for issue {body.issue_id}. "
                "A re-generation job has been queued."
            ),
        }

    return {
        "project_id": body.project_id,
        "issue_id": body.issue_id,
        "status": "manual_review",
        "message": (
            f"Issue {body.issue_id} requires manual intervention. "
            "Please review the continuity report and adjust the shot parameters."
        ),
    }
