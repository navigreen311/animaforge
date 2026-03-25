"""Generative Memory (G8) service — context recall, preference learning, parameter suggestion."""

from __future__ import annotations

import hashlib
import math
import struct
import uuid
from datetime import datetime, timezone
from typing import Any


# ---------------------------------------------------------------------------
# In-memory stores
# ---------------------------------------------------------------------------

# user_id → list of memory entries
_memory_store: dict[str, list[dict[str, Any]]] = {}

# user_id → list of style preference entries
_style_store: dict[str, list[dict[str, Any]]] = {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _text_from_context(context: dict) -> str:
    """Flatten a context dict into a single searchable string."""
    parts: list[str] = []
    for key in sorted(context.keys()):
        val = context[key]
        if isinstance(val, (list, tuple)):
            val = " ".join(str(v) for v in val)
        parts.append(f"{key}: {val}")
    return " | ".join(parts)


def _mock_embedding(text: str) -> list[float]:
    """Produce a deterministic 1536-dim embedding from *text* via SHA-256 seeding.

    The hash is used to seed a simple PRNG that fills 1536 floats in [-1, 1],
    then the vector is L2-normalised so cosine similarity behaves correctly.
    """
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    # Expand the 32-byte digest into 1536 floats by re-hashing in blocks
    floats: list[float] = []
    block = digest
    while len(floats) < 1536:
        block = hashlib.sha256(block).digest()
        # Each 32-byte block gives 8 doubles worth of entropy; we'll take 4
        # bytes at a time → uint32 → float in [-1, 1].
        for i in range(0, 32, 4):
            if len(floats) >= 1536:
                break
            uint_val = struct.unpack("<I", block[i : i + 4])[0]
            floats.append((uint_val / 0xFFFFFFFF) * 2.0 - 1.0)

    # L2-normalise
    norm = math.sqrt(sum(f * f for f in floats))
    if norm > 0:
        floats = [f / norm for f in floats]
    return floats


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Return cosine similarity between two equal-length vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def store_generation_context(
    user_id: str,
    project_id: str,
    context: dict,
) -> dict[str, Any]:
    """Store a generation context with auto-embedded text."""
    text = _text_from_context(context)
    embedding = _mock_embedding(text)
    entry: dict[str, Any] = {
        "id": uuid.uuid4().hex[:16],
        "project_id": project_id,
        "embedding": embedding,
        "context": context,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _memory_store.setdefault(user_id, []).append(entry)
    return entry


def recall_context(
    user_id: str,
    project_id: str,
    query: str,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Return the *limit* most-similar stored contexts for *query* within a project."""
    entries = _memory_store.get(user_id, [])
    entries = [e for e in entries if e["project_id"] == project_id]
    if not entries:
        return []

    query_emb = _mock_embedding(query)
    scored = [
        (cosine_similarity(query_emb, e["embedding"]), e) for e in entries
    ]
    scored.sort(key=lambda t: t[0], reverse=True)
    results: list[dict[str, Any]] = []
    for score, entry in scored[:limit]:
        results.append(
            {
                "id": entry["id"],
                "project_id": entry["project_id"],
                "context": entry["context"],
                "similarity": round(score, 6),
                "created_at": entry["created_at"],
            }
        )
    return results


def store_style_preference(
    user_id: str,
    style_fingerprint: dict,
    rating: float,
) -> dict[str, Any]:
    """Store a rated style preference."""
    entry: dict[str, Any] = {
        "id": uuid.uuid4().hex[:16],
        "style_fingerprint": style_fingerprint,
        "rating": rating,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _style_store.setdefault(user_id, []).append(entry)
    return entry


def recall_style_preferences(
    user_id: str,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """Return up to *limit* style preferences sorted by highest rating."""
    prefs = _style_store.get(user_id, [])
    sorted_prefs = sorted(prefs, key=lambda p: p["rating"], reverse=True)
    return sorted_prefs[:limit]


def suggest_parameters(
    user_id: str,
    new_prompt: str,
) -> list[dict[str, Any]]:
    """Find similar past prompts across all projects and return their parameters."""
    entries = _memory_store.get(user_id, [])
    if not entries:
        return []

    query_emb = _mock_embedding(new_prompt)
    scored = [
        (cosine_similarity(query_emb, e["embedding"]), e) for e in entries
    ]
    scored.sort(key=lambda t: t[0], reverse=True)
    suggestions: list[dict[str, Any]] = []
    for score, entry in scored[:5]:
        suggestions.append(
            {
                "context": entry["context"],
                "similarity": round(score, 6),
                "project_id": entry["project_id"],
            }
        )
    return suggestions


def get_user_profile(user_id: str) -> dict[str, Any]:
    """Aggregate user data into a profile summary."""
    entries = _memory_store.get(user_id, [])
    prefs = _style_store.get(user_id, [])

    # Preferred styles — top-rated fingerprints
    preferred_styles = [
        p["style_fingerprint"]
        for p in sorted(prefs, key=lambda p: p["rating"], reverse=True)[:5]
    ]

    # Average numeric parameters across stored contexts
    all_nums: dict[str, list[float]] = {}
    for entry in entries:
        for k, v in entry["context"].items():
            if isinstance(v, (int, float)):
                all_nums.setdefault(k, []).append(float(v))

    avg_parameters: dict[str, float] = {
        k: round(sum(vals) / len(vals), 4) for k, vals in all_nums.items()
    }

    return {
        "user_id": user_id,
        "preferred_styles": preferred_styles,
        "avg_parameters": avg_parameters,
        "generation_count": len(entries),
    }


def clear_memory(user_id: str, project_id: str | None = None) -> int:
    """Delete memory entries. If *project_id* given, only clear that project.

    Returns the number of entries removed.
    """
    removed = 0

    if project_id is None:
        removed += len(_memory_store.pop(user_id, []))
        removed += len(_style_store.pop(user_id, []))
    else:
        entries = _memory_store.get(user_id, [])
        before = len(entries)
        _memory_store[user_id] = [
            e for e in entries if e["project_id"] != project_id
        ]
        removed += before - len(_memory_store[user_id])

    return removed
