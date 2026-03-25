"""Application settings."""

from __future__ import annotations

from pydantic import BaseModel


class Settings(BaseModel):
    APP_NAME: str = "AnimaForge AI API"
    APP_VERSION: str = "0.1.0"


settings = Settings()
