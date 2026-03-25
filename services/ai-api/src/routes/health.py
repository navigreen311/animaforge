from fastapi import APIRouter

from src.config.settings import settings

router = APIRouter(prefix="/ai/v1", tags=["health"])


@router.get("/health")
async def health_check() -> dict:
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
