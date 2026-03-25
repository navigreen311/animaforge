"""Training data feedback pipeline routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services.training_service import (
    FEEDBACK_TYPES,
    collect_feedback,
    create_dataset,
    evaluate_model,
    get_finetune_status,
    list_finetune_jobs,
    promote_model,
    rollback_model,
    submit_finetune_job,
)

router = APIRouter(prefix="/ai/v1")

# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class _NoModelNs(BaseModel):
    model_config = {"protected_namespaces": ()}


class FeedbackRequest(BaseModel):
    job_id: str
    user_id: str
    rating: int = Field(..., ge=1, le=5)
    feedback_type: str
    details: str | None = None


class DatasetRequest(_NoModelNs):
    name: str
    model_id: str
    filters: dict[str, Any] | None = None
    split_ratio: dict[str, float] | None = None


class FinetuneRequest(_NoModelNs):
    dataset_id: str
    model_id: str
    hyperparams: dict[str, Any] | None = None


class EvaluateRequest(_NoModelNs):
    model_id: str
    test_dataset_id: str


class PromoteRequest(_NoModelNs):
    model_id: str
    environment: str


class RollbackRequest(_NoModelNs):
    model_id: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/training/feedback")
async def submit_feedback(body: FeedbackRequest) -> dict[str, Any]:
    """Submit user feedback on a generation output."""
    try:
        result = collect_feedback(
            job_id=body.job_id,
            user_id=body.user_id,
            rating=body.rating,
            feedback_type=body.feedback_type,
            details=body.details,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return result


@router.post("/training/dataset")
async def create_training_dataset(body: DatasetRequest) -> dict[str, Any]:
    """Create a training dataset from aggregated feedback."""
    try:
        result = create_dataset(
            name=body.name,
            model_id=body.model_id,
            filters=body.filters,
            split_ratio=body.split_ratio,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return result


@router.post("/training/finetune")
async def submit_finetune(body: FinetuneRequest) -> dict[str, Any]:
    """Submit a fine-tuning job."""
    try:
        result = submit_finetune_job(
            dataset_id=body.dataset_id,
            model_id=body.model_id,
            hyperparams=body.hyperparams,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return result


@router.get("/training/finetune/{job_id}")
async def finetune_status(job_id: str) -> dict[str, Any]:
    """Get the status of a fine-tuning job."""
    try:
        result = get_finetune_status(job_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return result


@router.get("/training/finetune")
async def list_finetune(model_id: str | None = None) -> list[dict[str, Any]]:
    """List all fine-tuning jobs, optionally filtered by model_id."""
    return list_finetune_jobs(model_id=model_id)


@router.post("/training/evaluate")
async def evaluate(body: EvaluateRequest) -> dict[str, Any]:
    """Evaluate a model against a test dataset."""
    try:
        result = evaluate_model(
            model_id=body.model_id,
            test_dataset_id=body.test_dataset_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return result


@router.post("/training/promote")
async def promote(body: PromoteRequest) -> dict[str, Any]:
    """Promote a model version to staging or production."""
    try:
        result = promote_model(
            model_id=body.model_id,
            environment=body.environment,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return result


@router.post("/training/rollback")
async def rollback(body: RollbackRequest) -> dict[str, Any]:
    """Rollback a model to the previous version."""
    try:
        result = rollback_model(model_id=body.model_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return result
