"""Service layer for cross-shot continuity checking (Engine E6).

Ensures consistency in characters, style, scene elements, and audio
across a sequence of shots within a project.
"""

from __future__ import annotations

import hashlib
import uuid
from typing import Any

# ── Thresholds ───────────────────────────────────────────────────────────────

_CHARACTER_SIMILARITY_THRESHOLD = 0.85
_STYLE_SIMILARITY_THRESHOLD = 0.85
_AUDIO_LEVEL_TOLERANCE = 6.0  # dB deviation allowed between adjacent shots


# ── Mock helpers ─────────────────────────────────────────────────────────────


def _mock_embedding(value: str) -> list[float]:
    """Return a deterministic mock embedding vector from a string seed."""
    h = hashlib.sha256(value.encode()).hexdigest()
    return [int(h[i : i + 2], 16) / 255.0 for i in range(0, 64, 2)]


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = sum(x * x for x in a) ** 0.5
    mag_b = sum(x * x for x in b) ** 0.5
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


# ── Core check functions ────────────────────────────────────────────────────


def check_character_consistency(shots: list[dict]) -> dict:
    """Compare character_refs across shots and detect identity drift.

    Each shot is expected to carry an optional ``character_ref`` key (a string
    identifier or URL).  The mock implementation computes an embedding-based
    similarity score between consecutive shots and flags any pair that falls
    below the threshold.
    """
    if len(shots) < 2:
        return {"score": 1.0, "issues": []}

    issues: list[dict] = []
    pair_scores: list[float] = []

    for i in range(len(shots) - 1):
        ref_a = shots[i].get("character_ref", "")
        ref_b = shots[i + 1].get("character_ref", "")

        if not ref_a and not ref_b:
            pair_scores.append(1.0)
            continue

        emb_a = _mock_embedding(ref_a)
        emb_b = _mock_embedding(ref_b)
        sim = round(_cosine_similarity(emb_a, emb_b), 4)
        pair_scores.append(sim)

        if sim < _CHARACTER_SIMILARITY_THRESHOLD:
            issues.append({
                "type": "character_drift",
                "shot_a": shots[i].get("shot_id", i),
                "shot_b": shots[i + 1].get("shot_id", i + 1),
                "similarity": sim,
                "threshold": _CHARACTER_SIMILARITY_THRESHOLD,
                "message": (
                    f"Character identity drift detected between shot "
                    f"{shots[i].get('shot_id', i)} and "
                    f"{shots[i + 1].get('shot_id', i + 1)} "
                    f"(similarity {sim} < {_CHARACTER_SIMILARITY_THRESHOLD})"
                ),
            })

    avg_score = sum(pair_scores) / len(pair_scores) if pair_scores else 1.0
    return {"score": round(avg_score, 4), "issues": issues}


def check_style_consistency(shots: list[dict]) -> dict:
    """Compare style_ref fingerprints across shots and detect style drift.

    Each shot may carry a ``style_ref`` key.  The mock implementation hashes
    each style ref and checks for deviations.
    """
    if len(shots) < 2:
        return {"score": 1.0, "issues": []}

    issues: list[dict] = []
    pair_scores: list[float] = []

    for i in range(len(shots) - 1):
        style_a = shots[i].get("style_ref", "")
        style_b = shots[i + 1].get("style_ref", "")

        if not style_a and not style_b:
            pair_scores.append(1.0)
            continue

        emb_a = _mock_embedding(style_a)
        emb_b = _mock_embedding(style_b)
        sim = round(_cosine_similarity(emb_a, emb_b), 4)
        pair_scores.append(sim)

        if sim < _STYLE_SIMILARITY_THRESHOLD:
            issues.append({
                "type": "style_mismatch",
                "shot_a": shots[i].get("shot_id", i),
                "shot_b": shots[i + 1].get("shot_id", i + 1),
                "similarity": sim,
                "threshold": _STYLE_SIMILARITY_THRESHOLD,
                "message": (
                    f"Style mismatch between shot "
                    f"{shots[i].get('shot_id', i)} and "
                    f"{shots[i + 1].get('shot_id', i + 1)} "
                    f"(similarity {sim} < {_STYLE_SIMILARITY_THRESHOLD})"
                ),
            })

    avg_score = sum(pair_scores) / len(pair_scores) if pair_scores else 1.0
    return {"score": round(avg_score, 4), "issues": issues}


def check_temporal_continuity(shots: list[dict]) -> dict:
    """Check that scene-graph transitions are logical.

    Verifies that characters present in shot N appear in shot N+1 unless
    there is an explicit scene cut (``is_cut=True``).
    """
    if len(shots) < 2:
        return {"score": 1.0, "issues": []}

    issues: list[dict] = []
    valid_transitions = 0
    total_transitions = 0

    for i in range(len(shots) - 1):
        total_transitions += 1
        current = shots[i]
        next_shot = shots[i + 1]

        # If next shot is a cut, transition is always valid.
        if next_shot.get("is_cut", False):
            valid_transitions += 1
            continue

        current_chars = set(current.get("characters", []))
        next_chars = set(next_shot.get("characters", []))

        # Characters from current shot should be in next shot (no disappearance).
        missing = current_chars - next_chars
        if missing and current_chars:
            issues.append({
                "type": "temporal_break",
                "shot_a": current.get("shot_id", i),
                "shot_b": next_shot.get("shot_id", i + 1),
                "missing_characters": sorted(missing),
                "message": (
                    f"Character(s) {sorted(missing)} present in shot "
                    f"{current.get('shot_id', i)} but missing in shot "
                    f"{next_shot.get('shot_id', i + 1)} without a scene cut"
                ),
            })
        else:
            valid_transitions += 1

    score = valid_transitions / total_transitions if total_transitions else 1.0
    return {"score": round(score, 4), "issues": issues}


def check_audio_continuity(shots: list[dict]) -> dict:
    """Verify audio levels and detect discontinuities in dialogue/music.

    Each shot may carry ``audio_level_db`` (float).  Large jumps between
    adjacent shots are flagged.
    """
    if len(shots) < 2:
        return {"score": 1.0, "issues": []}

    issues: list[dict] = []
    pair_scores: list[float] = []

    for i in range(len(shots) - 1):
        level_a = shots[i].get("audio_level_db")
        level_b = shots[i + 1].get("audio_level_db")

        if level_a is None or level_b is None:
            pair_scores.append(1.0)
            continue

        delta = abs(level_a - level_b)
        # Normalise to a 0-1 score (1 = no deviation, 0 = max deviation).
        pair_score = max(0.0, 1.0 - delta / (_AUDIO_LEVEL_TOLERANCE * 2))
        pair_scores.append(pair_score)

        if delta > _AUDIO_LEVEL_TOLERANCE:
            issues.append({
                "type": "audio_discontinuity",
                "shot_a": shots[i].get("shot_id", i),
                "shot_b": shots[i + 1].get("shot_id", i + 1),
                "delta_db": round(delta, 2),
                "tolerance_db": _AUDIO_LEVEL_TOLERANCE,
                "message": (
                    f"Audio level jump of {round(delta, 2)} dB between shot "
                    f"{shots[i].get('shot_id', i)} and "
                    f"{shots[i + 1].get('shot_id', i + 1)} "
                    f"exceeds tolerance of {_AUDIO_LEVEL_TOLERANCE} dB"
                ),
            })

    avg_score = sum(pair_scores) / len(pair_scores) if pair_scores else 1.0
    return {"score": round(avg_score, 4), "issues": issues}


# ── Report & fix generation ─────────────────────────────────────────────────


def generate_continuity_report(
    project_id: str,
    shot_ids: list[str],
    shots: list[dict],
) -> dict:
    """Run all continuity checks and return a comprehensive report.

    Parameters
    ----------
    project_id:
        The project these shots belong to.
    shot_ids:
        Ordered list of shot identifiers to check.
    shots:
        Full shot data dicts (must match *shot_ids* in order).

    Returns
    -------
    dict with keys: overall_score, issues, warnings, character_consistency,
    style_consistency, temporal_score, audio_score.
    """
    char_result = check_character_consistency(shots)
    style_result = check_style_consistency(shots)
    temporal_result = check_temporal_continuity(shots)
    audio_result = check_audio_continuity(shots)

    all_issues: list[dict] = []
    warnings: list[str] = []

    for result in (char_result, style_result, temporal_result, audio_result):
        for issue in result["issues"]:
            issue["id"] = f"issue-{uuid.uuid4().hex[:8]}"
            all_issues.append(issue)

    # Warnings for borderline scores.
    if 0.85 <= char_result["score"] < 0.92:
        warnings.append("Character consistency is borderline — review recommended.")
    if 0.85 <= style_result["score"] < 0.92:
        warnings.append("Style consistency is borderline — review recommended.")

    overall = round(
        (
            char_result["score"]
            + style_result["score"]
            + temporal_result["score"]
            + audio_result["score"]
        )
        / 4.0,
        4,
    )

    return {
        "project_id": project_id,
        "shot_ids": shot_ids,
        "overall_score": overall,
        "issues": all_issues,
        "warnings": warnings,
        "character_consistency": char_result["score"],
        "style_consistency": style_result["score"],
        "temporal_score": temporal_result["score"],
        "audio_score": audio_result["score"],
    }


def suggest_fixes(issues: list[dict]) -> list[dict]:
    """For each issue, suggest a concrete remediation action.

    Returns a list of fix suggestions, one per issue.
    """
    suggestions: list[dict] = []

    for issue in issues:
        issue_type = issue.get("type", "unknown")
        fix: dict[str, Any] = {
            "issue_id": issue.get("id", "unknown"),
            "issue_type": issue_type,
        }

        if issue_type == "character_drift":
            fix["suggestion"] = (
                f"Re-generate shot {issue['shot_b']} with character_ref "
                f"from shot {issue['shot_a']}"
            )
            fix["auto_fixable"] = True

        elif issue_type == "style_mismatch":
            fix["suggestion"] = (
                f"Re-generate shot {issue['shot_b']} using the style_ref "
                f"from shot {issue['shot_a']}"
            )
            fix["auto_fixable"] = True

        elif issue_type == "temporal_break":
            missing = ", ".join(issue.get("missing_characters", []))
            fix["suggestion"] = (
                f"Add character(s) [{missing}] to shot {issue['shot_b']} "
                f"or mark the transition as a scene cut"
            )
            fix["auto_fixable"] = False

        elif issue_type == "audio_discontinuity":
            fix["suggestion"] = (
                f"Normalise audio levels between shot {issue['shot_a']} and "
                f"shot {issue['shot_b']} (delta: {issue.get('delta_db', '?')} dB)"
            )
            fix["auto_fixable"] = True

        else:
            fix["suggestion"] = "Manual review required."
            fix["auto_fixable"] = False

        suggestions.append(fix)

    return suggestions
