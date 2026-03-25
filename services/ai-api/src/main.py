"""AnimaForge AI API - FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.config.settings import settings
from src.routes.health import router as health_router
from src.routes.jobs import router as jobs_router
from src.routes.generate import router as generate_router
from src.routes.audio import router as audio_router
from src.routes.style import router as style_router
from src.routes.script import router as script_router
from src.routes.avatar import router as avatar_router
from src.routes.memory import router as memory_router
from src.services.job_manager import connect_redis, close_redis


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hook."""
    connect_redis()
    yield
    close_redis()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(jobs_router)
app.include_router(generate_router)
app.include_router(audio_router)
app.include_router(style_router)
app.include_router(script_router)
app.include_router(avatar_router)
app.include_router(memory_router)


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/")
async def root() -> dict:
    return {"service": "AnimaForge AI API", "version": "0.1.0"}
