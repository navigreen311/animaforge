"""Routes for iterative script assistant with conversation memory (G1b)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.script_chat_service import create_session, delete_session, get_session

router = APIRouter(prefix="/ai/v1")


# -- Request / Response Models ------------------------------------------------


class CreateSessionRequest(BaseModel):
    project_id: str
    world_bible: str | None = None
    characters: list[dict] | None = None


class CreateSessionResponse(BaseModel):
    project_id: str
    status: str


class MessageRequest(BaseModel):
    instruction: str


class MessageResponse(BaseModel):
    response: str
    updated_script: str | None = None


class RefineRequest(BaseModel):
    instruction: str


class RefineResponse(BaseModel):
    refined_script: str
    changes: list[str]


class ExpandRequest(BaseModel):
    scene_index: int | None = None
    scene_desc: str | None = None


class ExpandResponse(BaseModel):
    expanded_scene: str
    characters_involved: list[str]
    estimated_duration_ms: int


class StoryboardFrame(BaseModel):
    frame_number: int
    visual_description: str
    camera_angle: str
    duration_ms: int
    dialogue_overlay: str | None = None


class StoryboardResponse(BaseModel):
    storyboard_frames: list[StoryboardFrame]


class ShotSceneGraph(BaseModel):
    subject: str
    action: str
    emotion: str
    dialogue: str | None = None


class ShotCamera(BaseModel):
    angle: str
    movement: str


class ShotItem(BaseModel):
    shot_number: int
    description: str
    duration_ms: int
    camera: ShotCamera
    scene_graph: ShotSceneGraph


class ExportShotsResponse(BaseModel):
    shots: list[ShotItem]


# -- Helper -------------------------------------------------------------------


def _require_session(project_id: str):
    session = get_session(project_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session not found: {project_id}")
    return session


# -- Endpoints ----------------------------------------------------------------


@router.post("/script/session", response_model=CreateSessionResponse, status_code=201)
async def create_script_session(body: CreateSessionRequest) -> CreateSessionResponse:
    """Create a new script editing session for a project."""
    create_session(
        project_id=body.project_id,
        world_bible=body.world_bible,
        characters=body.characters,
    )
    return CreateSessionResponse(project_id=body.project_id, status="created")


@router.post(
    "/script/session/{project_id}/message",
    response_model=MessageResponse,
    status_code=200,
)
async def send_message(project_id: str, body: MessageRequest) -> MessageResponse:
    """Send a message to the script assistant and get a response."""
    session = _require_session(project_id)
    result = await session.refine_script(body.instruction)
    return MessageResponse(
        response=result.get("changes", ["Applied changes"])[0]
        if result.get("changes")
        else "Applied changes",
        updated_script=result.get("refined_script"),
    )


@router.post(
    "/script/session/{project_id}/refine",
    response_model=RefineResponse,
    status_code=200,
)
async def refine_script(project_id: str, body: RefineRequest) -> RefineResponse:
    """Refine the current script with an instruction."""
    session = _require_session(project_id)
    result = await session.refine_script(body.instruction)
    return RefineResponse(
        refined_script=result["refined_script"],
        changes=result["changes"],
    )


@router.post(
    "/script/session/{project_id}/expand",
    response_model=ExpandResponse,
    status_code=200,
)
async def expand_scene(project_id: str, body: ExpandRequest) -> ExpandResponse:
    """Expand a scene into a detailed description."""
    session = _require_session(project_id)
    scene_desc = body.scene_desc or f"Scene at index {body.scene_index or 0}"
    result = await session.expand_scene(scene_desc)
    return ExpandResponse(
        expanded_scene=result["expanded_scene"],
        characters_involved=result["characters_involved"],
        estimated_duration_ms=result["estimated_duration_ms"],
    )


@router.post(
    "/script/session/{project_id}/storyboard",
    response_model=StoryboardResponse,
    status_code=200,
)
async def generate_storyboard(project_id: str) -> StoryboardResponse:
    """Generate storyboard frame descriptions from the current script."""
    session = _require_session(project_id)
    script = session.current_script or "INT. STUDIO - DAY\n\n[Default scene]"
    result = await session.generate_storyboard_descriptions(script)
    return StoryboardResponse(storyboard_frames=result["storyboard_frames"])


@router.post(
    "/script/session/{project_id}/export-shots",
    response_model=ExportShotsResponse,
    status_code=200,
)
async def export_shots(project_id: str) -> ExportShotsResponse:
    """Export the current script as a shot breakdown with scene graphs."""
    session = _require_session(project_id)
    script = session.current_script or "INT. STUDIO - DAY\n\n[Default scene]"
    result = await session.export_to_shots(script)
    return ExportShotsResponse(shots=result["shots"])


@router.delete("/script/session/{project_id}", status_code=200)
async def delete_script_session(project_id: str) -> dict:
    """End and clean up a script session."""
    deleted = delete_session(project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Session not found: {project_id}")
    return {"project_id": project_id, "status": "deleted"}
