from __future__ import annotations

import uuid
from typing import Any

# In-memory job store (swap for Redis in production)
_jobs: dict[str, dict[str, Any]] = {}


def create_job(job_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Create a new job and return its metadata."""
    job_id = str(uuid.uuid4())
    job = {
        "job_id": job_id,
        "job_type": job_type,
        "status": "queued",
        "progress": 0.0,
        "payload": payload,
        "output_url": None,
        "quality_scores": None,
        "estimated_seconds": _estimate_seconds(job_type),
    }
    _jobs[job_id] = job
    return job


def update_job(job_id: str, **fields: Any) -> dict[str, Any] | None:
    """Update fields on an existing job. Returns updated job or None."""
    job = _jobs.get(job_id)
    if job is None:
        return None
    job.update(fields)
    return job


def get_job(job_id: str) -> dict[str, Any] | None:
    """Retrieve a job by ID. Returns None if not found."""
    return _jobs.get(job_id)


def _estimate_seconds(job_type: str) -> int:
    """Return a rough ETA in seconds based on job type."""
    estimates: dict[str, int] = {
        "generate_video": 120,
        "generate_audio": 30,
        "generate_avatar": 60,
        "style_clone": 45,
        "img_to_cartoon": 20,
        "script_generate": 15,
    }
    return estimates.get(job_type, 60)
