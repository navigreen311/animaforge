"""Webhook notifier -- pushes job events to the realtime service."""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

REALTIME_BASE_URL = os.getenv(
    "REALTIME_SERVICE_URL", "http://localhost:4500"
)
INTERNAL_ENDPOINT = "/internal/job-update"
TIMEOUT_SECONDS = 10.0


async def _post_event(payload: dict[str, Any]) -> None:
    """Fire-and-forget POST to the realtime service."""
    url = f"{REALTIME_BASE_URL}{INTERNAL_ENDPOINT}"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            logger.info("Webhook delivered: %s -> %s", payload.get("event"), url)
    except httpx.HTTPError as exc:
        logger.error("Webhook delivery failed: %s", exc)


async def notify_job_progress(
    job_id: str,
    progress: float,
    stage: str,
) -> None:
    """Notify the realtime service of incremental job progress."""
    await _post_event(
        {
            "event": "job.progress",
            "job_id": job_id,
            "progress": progress,
            "stage": stage,
        }
    )


async def notify_job_complete(
    job_id: str,
    output_url: str,
    scores: dict[str, Any] | None = None,
) -> None:
    """Notify the realtime service that a job has finished successfully."""
    await _post_event(
        {
            "event": "job.complete",
            "job_id": job_id,
            "output_url": output_url,
            "scores": scores,
        }
    )


async def notify_job_failed(
    job_id: str,
    error: str,
) -> None:
    """Notify the realtime service that a job has failed."""
    await _post_event(
        {
            "event": "job.failed",
            "job_id": job_id,
            "error": error,
        }
    )
