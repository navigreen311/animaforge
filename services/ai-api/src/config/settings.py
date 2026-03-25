from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """AnimaForge AI API configuration."""

    APP_NAME: str = "AnimaForge AI API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    REDIS_URL: str = "redis://localhost:6379/0"
    MODEL_CACHE_DIR: str = "/tmp/animaforge/model_cache"
    MAX_CONCURRENT_JOBS: int = 4
    DEFAULT_TIMEOUT_SECONDS: int = 300
    ASSET_STORAGE_URL: str = "http://localhost:9000"
    WEBHOOK_CALLBACK_URL: str = ""

    model_config = {"env_prefix": "AF_", "env_file": ".env"}


settings = Settings()
