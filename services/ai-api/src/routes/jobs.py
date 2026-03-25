from fastapi import APIRouter, HTTPException

from src.models.schemas import JobStatusResponse
from src.services.job_manager import get_job

router = APIRouter(prefix="/ai/v1", tags=["jobs"])


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str) -> JobStatusResponse:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatusResponse(
        status=job["status"],
        progress=job["progress"],
        output_url=job.get("output_url"),
        quality_scores=job.get("quality_scores"),
    )
