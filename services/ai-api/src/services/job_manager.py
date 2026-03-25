"""Job manager with Redis-backed storage and in-memory fallback."""

from __future__ import annotations

import json
import logging
import os
import uuid
from typing import Any

logger = logging.getLogger(__name__)

_redis_client = None
_fallback_jobs: dict[str, dict[str, Any]] = {}
_fallback_user_jobs: dict[str, set[str]] = {}

JOB_TTL_SECONDS = 86400  # 24 hours


def _get_redis():
    """Return the shared Redis client, or None if unavailable."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        import redis
        url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        _redis_client = redis.Redis.from_url(url, decode_responses=True)
        _redis_client.ping()
        logger.info("Connected to Redis at %s", url)
        return _redis_client
    except Exception as exc:
        logger.warning("Redis unavailable, using in-memory fallback: %s", exc)
        _redis_client = None
        return None


def connect_redis() -> None:
    """Explicitly open the Redis connection (called at app startup)."""
    _get_redis()


def close_redis() -> None:
    """Close the Redis connection (called at app shutdown)."""
    global _redis_client
    if _redis_client is not None:
        try:
            _redis_client.close()
        except Exception:
            pass
        _redis_client = None


def _serialize_value(value: Any) -> str:
    """Ensure values stored in Redis are strings."""
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value)
    return str(value)


def _deserialize_value(key: str, value: str) -> Any:
    """Best-effort deserialization of a Redis hash value."""
    if value == "":
        return None
    if value.startswith("{") or value.startswith("["):
        try:
            return json.loads(value)
        except (json.JSONDecodeError, ValueError):
            pass
    try:
        return float(value) if "." in value else int(value)
    except (ValueError, TypeError):
        pass
    return value


def store_job(job_id: str, data: dict[str, Any]) -> None:
    """Persist a job to Redis (or in-memory fallback)."""
    r = _get_redis()
    mapping = {k: _serialize_value(v) for k, v in data.items()}
    if r is not None:
        r.hset(f"job:{job_id}", mapping=mapping)
        r.expire(f"job:{job_id}", JOB_TTL_SECONDS)
        user_id = data.get("user_id")
        if user_id:
            r.sadd(f"user_jobs:{user_id}", job_id)
            r.expire(f"user_jobs:{user_id}", JOB_TTL_SECONDS)
    else:
        _fallback_jobs[job_id] = dict(data)
        user_id = data.get("user_id")
        if user_id:
            _fallback_user_jobs.setdefault(user_id, set()).add(job_id)


def get_job(job_id: str) -> dict[str, Any] | None:
    """Retrieve a job by ID. Returns None if not found."""
    r = _get_redis()
    if r is not None:
        raw = r.hgetall(f"job:{job_id}")
        if not raw:
            return None
        return {k: _deserialize_value(k, v) for k, v in raw.items()}
    return _fallback_jobs.get(job_id)


def update_job(job_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    """Update fields on an existing job. Returns updated job or None."""
    r = _get_redis()
    if r is not None:
        if not r.exists(f"job:{job_id}"):
            return None
        mapping = {k: _serialize_value(v) for k, v in updates.items()}
        r.hset(f"job:{job_id}", mapping=mapping)
        r.expire(f"job:{job_id}", JOB_TTL_SECONDS)
        return get_job(job_id)
    job = _fallback_jobs.get(job_id)
    if job is None:
        return None
    job.update(updates)
    return job


def list_jobs(user_id: str) -> list[str]:
    """Return all job IDs associated with a user."""
    r = _get_redis()
    if r is not None:
        members = r.smembers(f"user_jobs:{user_id}")
        return list(members)
    return list(_fallback_user_jobs.get(user_id, set()))


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


def create_job(
    job_type: str,
    payload: dict[str, Any],
    user_id: str | None = None,
) -> dict[str, Any]:
    """Create a new job, persist it, and return its metadata."""
    job_id = str(uuid.uuid4())
    job: dict[str, Any] = {
        "job_id": job_id,
        "job_type": job_type,
        "status": "queued",
        "progress": 0.0,
        "payload": payload,
        "output_url": None,
        "quality_scores": None,
        "estimated_seconds": _estimate_seconds(job_type),
    }
    if user_id:
        job["user_id"] = user_id
    store_job(job_id, job)
    return job
