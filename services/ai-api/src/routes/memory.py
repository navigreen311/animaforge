"""Routes for Generative Memory (G8) — context recall, preferences, parameter suggestion."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..services.memory_service import (
    clear_memory,
    get_user_profile,
    recall_context,
    recall_style_preferences,
    store_generation_context,
    store_style_preference,
    suggest_parameters,
)

router = APIRouter(prefix="/ai/v1")


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class StoreRequest(BaseModel):
    user_id: str
    project_id: str
    context: dict[str, Any]


class RecallRequest(BaseModel):
    user_id: str
    project_id: str
    query: str
    limit: int = Field(default=5, ge=1, le=50)


class StylePreferenceRequest(BaseModel):
    user_id: str
    style_fingerprint: dict[str, Any]
    rating: float = Field(ge=0.0, le=5.0)


class SuggestRequest(BaseModel):
    user_id: str
    prompt: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/memory/store")
async def store_memory(request: StoreRequest) -> dict[str, Any]:
    """Store a generation context for future recall."""
    entry = store_generation_context(
        user_id=request.user_id,
        project_id=request.project_id,
        context=request.context,
    )
    return {
        "id": entry["id"],
        "project_id": entry["project_id"],
        "created_at": entry["created_at"],
    }


@router.post("/memory/recall")
async def recall_memory(request: RecallRequest) -> dict[str, Any]:
    """Recall stored contexts by semantic similarity."""
    results = recall_context(
        user_id=request.user_id,
        project_id=request.project_id,
        query=request.query,
        limit=request.limit,
    )
    return {"results": results, "count": len(results)}


@router.post("/memory/style-preference")
async def store_style(request: StylePreferenceRequest) -> dict[str, Any]:
    """Store a rated style preference."""
    entry = store_style_preference(
        user_id=request.user_id,
        style_fingerprint=request.style_fingerprint,
        rating=request.rating,
    )
    return entry


@router.get("/memory/preferences/{user_id}")
async def get_preferences(user_id: str, limit: int = 10) -> dict[str, Any]:
    """Retrieve top-rated style preferences for a user."""
    prefs = recall_style_preferences(user_id=user_id, limit=limit)
    return {"preferences": prefs, "count": len(prefs)}


@router.post("/memory/suggest")
async def suggest(request: SuggestRequest) -> dict[str, Any]:
    """Suggest parameters based on similar past prompts."""
    suggestions = suggest_parameters(
        user_id=request.user_id,
        new_prompt=request.prompt,
    )
    return {"suggestions": suggestions, "count": len(suggestions)}


@router.get("/memory/profile/{user_id}")
async def profile(user_id: str) -> dict[str, Any]:
    """Get aggregated user memory profile."""
    return get_user_profile(user_id=user_id)


@router.delete("/memory/{user_id}")
async def delete_memory(user_id: str, project_id: str | None = None) -> dict[str, Any]:
    """Clear memory entries for a user (optionally scoped to a project)."""
    removed = clear_memory(user_id=user_id, project_id=project_id)
    return {"removed": removed}
