"""Service layer for training data feedback pipeline.

Provides user feedback collection, dataset creation, fine-tuning job
management, model evaluation, and model promotion/rollback.  All heavy
computations are simulated with deterministic mocks so the API contract
is exercisable end-to-end before real infrastructure is wired in.
"""

from __future__ import annotations

import hashlib
import math
import time
import uuid
from typing import Any

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

FEEDBACK_TYPES = [
    "quality",
    "style_match",
    "character_accuracy",
    "motion_quality",
    "audio_sync",
]

# In-memory stores (replaced by real persistence in production)
_feedback_store: list[dict[str, Any]] = []
_dataset_store: dict[str, dict[str, Any]] = {}
_finetune_store: dict[str, dict[str, Any]] = {}
_model_versions: dict[str, list[dict[str, Any]]] = {}

# ---------------------------------------------------------------------------
# Feedback collection
# ---------------------------------------------------------------------------


def collect_feedback(
    job_id: str,
    user_id: str,
    rating: int,
    feedback_type: str,
    details: str | None = None,
) -> dict[str, Any]:
    """Store user feedback on a generation output.

    *feedback_type* must be one of :data:`FEEDBACK_TYPES`.
    *rating* should be 1-5.

    Returns the persisted feedback record.
    """
    if feedback_type not in FEEDBACK_TYPES:
        raise ValueError(
            f"Invalid feedback_type '{feedback_type}'. "
            f"Must be one of {FEEDBACK_TYPES}"
        )
    if not 1 <= rating <= 5:
        raise ValueError("Rating must be between 1 and 5")

    record: dict[str, Any] = {
        "feedback_id": str(uuid.uuid4()),
        "job_id": job_id,
        "user_id": user_id,
        "rating": rating,
        "feedback_type": feedback_type,
        "details": details,
        "created_at": time.time(),
    }
    _feedback_store.append(record)
    return record


# ---------------------------------------------------------------------------
# Aggregate training data
# ---------------------------------------------------------------------------


def aggregate_training_data(
    model_id: str,
    min_rating: int = 4,
    limit: int = 1000,
) -> dict[str, Any]:
    """Collect high-rated outputs as positive training examples.

    Returns ``{samples, count, avg_rating}``.
    """
    filtered = [
        fb for fb in _feedback_store
        if fb["rating"] >= min_rating
    ]
    # Deterministic sort by created_at descending, then cap at limit.
    filtered.sort(key=lambda x: x["created_at"], reverse=True)
    samples = filtered[:limit]

    avg_rating = (
        round(sum(s["rating"] for s in samples) / len(samples), 2)
        if samples
        else 0.0
    )

    return {
        "model_id": model_id,
        "samples": samples,
        "count": len(samples),
        "avg_rating": avg_rating,
    }


# ---------------------------------------------------------------------------
# Dataset creation
# ---------------------------------------------------------------------------


def create_dataset(
    name: str,
    model_id: str,
    filters: dict[str, Any] | None = None,
    split_ratio: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Create a training dataset from aggregated feedback.

    *split_ratio* defaults to ``{train: 0.8, val: 0.1, test: 0.1}``.

    Returns ``{dataset_id, name, model_id, train_count, val_count, test_count}``.
    """
    if split_ratio is None:
        split_ratio = {"train": 0.8, "val": 0.1, "test": 0.1}

    # Validate ratio sums to ~1.0
    ratio_sum = sum(split_ratio.values())
    if abs(ratio_sum - 1.0) > 0.01:
        raise ValueError(
            f"split_ratio must sum to 1.0, got {ratio_sum:.2f}"
        )

    min_rating = (filters or {}).get("min_rating", 4)
    agg = aggregate_training_data(model_id, min_rating=min_rating)
    total = agg["count"]

    train_count = int(math.floor(total * split_ratio.get("train", 0.8)))
    val_count = int(math.floor(total * split_ratio.get("val", 0.1)))
    test_count = total - train_count - val_count

    dataset_id = str(uuid.uuid4())
    record: dict[str, Any] = {
        "dataset_id": dataset_id,
        "name": name,
        "model_id": model_id,
        "filters": filters,
        "split_ratio": split_ratio,
        "train_count": train_count,
        "val_count": val_count,
        "test_count": test_count,
        "created_at": time.time(),
    }
    _dataset_store[dataset_id] = record

    return {
        "dataset_id": dataset_id,
        "name": name,
        "model_id": model_id,
        "train_count": train_count,
        "val_count": val_count,
        "test_count": test_count,
    }


# ---------------------------------------------------------------------------
# Fine-tuning
# ---------------------------------------------------------------------------


def submit_finetune_job(
    dataset_id: str,
    model_id: str,
    hyperparams: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Submit a fine-tuning job.

    Returns ``{job_id, dataset_id, model_id, estimated_hours, cost_estimate}``.
    """
    if dataset_id not in _dataset_store:
        raise ValueError(f"Dataset '{dataset_id}' not found")

    hp = hyperparams or {}
    epochs = hp.get("epochs", 10)
    batch_size = hp.get("batch_size", 32)

    ds = _dataset_store[dataset_id]
    train_count = ds["train_count"]

    # Simulated estimates
    estimated_hours = round(max(0.5, train_count * epochs / 10000), 2)
    cost_estimate = round(estimated_hours * 4.50, 2)  # $4.50/GPU-hour

    job_id = f"ft-{uuid.uuid4().hex[:12]}"
    record: dict[str, Any] = {
        "job_id": job_id,
        "dataset_id": dataset_id,
        "model_id": model_id,
        "hyperparams": {
            "epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": hp.get("learning_rate", 1e-5),
        },
        "status": "queued",
        "progress": 0.0,
        "metrics": {"loss": None, "val_loss": None, "epoch": 0},
        "estimated_hours": estimated_hours,
        "cost_estimate": cost_estimate,
        "created_at": time.time(),
    }
    _finetune_store[job_id] = record

    return {
        "job_id": job_id,
        "dataset_id": dataset_id,
        "model_id": model_id,
        "estimated_hours": estimated_hours,
        "cost_estimate": cost_estimate,
    }


def get_finetune_status(job_id: str) -> dict[str, Any]:
    """Return current status of a fine-tuning job.

    Returns ``{job_id, status, progress, metrics}``.
    """
    if job_id not in _finetune_store:
        raise ValueError(f"Fine-tune job '{job_id}' not found")

    job = _finetune_store[job_id]

    # Simulate progress: advance status based on elapsed time.
    elapsed = time.time() - job["created_at"]
    if elapsed > 5:
        job["status"] = "running"
        job["progress"] = min(0.95, elapsed / (job["estimated_hours"] * 3600))
        epoch = int(job["progress"] * job["hyperparams"]["epochs"])
        seed = int(hashlib.sha256(job_id.encode()).hexdigest(), 16)
        base_loss = 0.8 - (job["progress"] * 0.6)
        job["metrics"] = {
            "loss": round(base_loss, 4),
            "val_loss": round(base_loss + 0.05, 4),
            "epoch": epoch,
        }
    if elapsed > 10:
        job["status"] = "completed"
        job["progress"] = 1.0
        job["metrics"] = {
            "loss": 0.1523,
            "val_loss": 0.1891,
            "epoch": job["hyperparams"]["epochs"],
        }

    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": round(job["progress"], 4),
        "metrics": job["metrics"],
    }


def list_finetune_jobs(model_id: str | None = None) -> list[dict[str, Any]]:
    """List all fine-tuning jobs, optionally filtered by model_id."""
    jobs = list(_finetune_store.values())
    if model_id is not None:
        jobs = [j for j in jobs if j["model_id"] == model_id]
    return [
        {
            "job_id": j["job_id"],
            "model_id": j["model_id"],
            "dataset_id": j["dataset_id"],
            "status": j["status"],
            "created_at": j["created_at"],
        }
        for j in jobs
    ]


# ---------------------------------------------------------------------------
# Model evaluation
# ---------------------------------------------------------------------------


def evaluate_model(
    model_id: str,
    test_dataset_id: str,
) -> dict[str, Any]:
    """Run evaluation on a model against a test dataset.

    Returns ``{model_id, test_dataset_id, accuracy, lpips_mean,
    identity_score, user_preference_score}``.
    """
    if test_dataset_id not in _dataset_store:
        raise ValueError(f"Dataset '{test_dataset_id}' not found")

    # Deterministic simulated metrics seeded by model + dataset.
    seed = int(
        hashlib.sha256(
            f"{model_id}:{test_dataset_id}".encode()
        ).hexdigest(),
        16,
    )

    accuracy = round(0.75 + ((seed & 0xFFFF) / 0xFFFF) * 0.20, 4)
    lpips_mean = round(0.02 + ((seed >> 16) & 0xFFFF) / 0xFFFF * 0.10, 4)
    identity_score = round(0.80 + ((seed >> 32) & 0xFFFF) / 0xFFFF * 0.18, 4)
    user_preference_score = round(
        0.70 + ((seed >> 48) & 0xFFFF) / 0xFFFF * 0.25, 4
    )

    return {
        "model_id": model_id,
        "test_dataset_id": test_dataset_id,
        "accuracy": accuracy,
        "lpips_mean": lpips_mean,
        "identity_score": identity_score,
        "user_preference_score": user_preference_score,
    }


# ---------------------------------------------------------------------------
# Model promotion / rollback
# ---------------------------------------------------------------------------


def promote_model(
    model_id: str,
    environment: str,
) -> dict[str, Any]:
    """Promote a model version to staging or production.

    Returns the promotion record.
    """
    if environment not in ("staging", "production"):
        raise ValueError(
            f"Invalid environment '{environment}'. Must be 'staging' or 'production'"
        )

    version_id = str(uuid.uuid4())
    record: dict[str, Any] = {
        "version_id": version_id,
        "model_id": model_id,
        "environment": environment,
        "promoted_at": time.time(),
    }

    _model_versions.setdefault(model_id, []).append(record)

    return {
        "version_id": version_id,
        "model_id": model_id,
        "environment": environment,
        "status": "promoted",
    }


def rollback_model(model_id: str) -> dict[str, Any]:
    """Rollback a model to its previous version.

    Returns the rollback record with the restored version.
    """
    versions = _model_versions.get(model_id, [])
    if len(versions) < 2:
        raise ValueError(
            f"Cannot rollback model '{model_id}': fewer than 2 versions"
        )

    # Remove current version, restore previous
    removed = versions.pop()
    restored = versions[-1]

    return {
        "model_id": model_id,
        "rolled_back_version": removed["version_id"],
        "restored_version": restored["version_id"],
        "environment": restored["environment"],
        "status": "rolled_back",
    }


# ---------------------------------------------------------------------------
# Store reset (testing helper)
# ---------------------------------------------------------------------------


def _reset_stores() -> None:
    """Clear all in-memory stores.  Used by tests."""
    _feedback_store.clear()
    _dataset_store.clear()
    _finetune_store.clear()
    _model_versions.clear()
