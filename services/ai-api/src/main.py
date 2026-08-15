"""AnimaForge AI API - FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.config.settings import settings
from src.routes.audio import router as audio_router
from src.routes.avatar import router as avatar_router
from src.routes.capabilities import router as capabilities_router
from src.routes.cartoon_pro import router as cartoon_pro_router
from src.routes.continuity import router as continuity_router
from src.routes.dubbing import router as dubbing_router
from src.routes.generate import router as generate_router
from src.routes.health import router as health_router
from src.routes.jobs import router as jobs_router
from src.routes.memory import router as memory_router
from src.routes.mocap import router as mocap_router
from src.routes.music import router as music_router
from src.routes.physics import router as physics_router
from src.routes.scene_graph import router as scene_graph_router
from src.routes.script import router as script_router
from src.routes.script_chat import router as script_chat_router
from src.routes.style import router as style_router
from src.routes.style_advanced import router as style_advanced_router
from src.routes.training import router as training_router
from src.services.job_manager import close_redis, connect_redis


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
app.include_router(capabilities_router)
app.include_router(jobs_router)
app.include_router(memory_router)
app.include_router(generate_router)
app.include_router(audio_router)
app.include_router(style_router)
app.include_router(script_router)
app.include_router(avatar_router)
app.include_router(style_advanced_router)
app.include_router(cartoon_pro_router)

# These eight shipped with route modules and passing tests but were never
# mounted, so every endpoint below 404'd on the running service. The tests did
# not catch it because each tests/test_*_api.py builds its own FastAPI() and
# mounts the router itself -- proving the router works in isolation, never that
# it is reachable. tests/test_router_mounting.py now asserts against this app.
app.include_router(scene_graph_router)  # E3
app.include_router(continuity_router)  # E6
app.include_router(mocap_router)  # E8
app.include_router(music_router)  # F3
app.include_router(physics_router)  # F5
app.include_router(dubbing_router)  # G2
app.include_router(training_router)  # D10
app.include_router(script_chat_router)


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
