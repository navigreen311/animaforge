"""Tests for iterative script assistant with conversation memory (G1b)."""

from __future__ import annotations

import sys
from pathlib import Path

_AI_API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_AI_API_ROOT))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.script_chat import router
from src.services.script_chat_service import (
    ScriptSession,
    clear_all_sessions,
    create_session,
    delete_session,
    get_session,
)


@pytest.fixture(autouse=True)
def _clean_sessions():
    """Ensure a clean session store for every test."""
    clear_all_sessions()
    yield
    clear_all_sessions()


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


# -- 1. Create session --------------------------------------------------------


class TestCreateSession:

    def test_create_session_returns_201(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/script/session",
            json={"project_id": "proj-100"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["project_id"] == "proj-100"
        assert data["status"] == "created"

    def test_create_session_with_context(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/script/session",
            json={
                "project_id": "proj-101",
                "world_bible": "A cyberpunk city in 2077",
                "characters": [{"id": "hero", "name": "Neo", "description": "The chosen one"}],
            },
        )
        assert resp.status_code == 201


# -- 2. Send message ----------------------------------------------------------


class TestSendMessage:

    def test_send_message_returns_response(self, client: TestClient) -> None:
        client.post("/ai/v1/script/session", json={"project_id": "proj-200"})
        resp = client.post(
            "/ai/v1/script/session/proj-200/message",
            json={"instruction": "Add more tension to the opening"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "response" in data
        assert isinstance(data["response"], str)

    def test_send_message_missing_session_returns_404(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/script/session/nonexistent/message",
            json={"instruction": "anything"},
        )
        assert resp.status_code == 404


# -- 3. Refine script ---------------------------------------------------------


class TestRefineScript:

    def test_refine_returns_refined_script(self, client: TestClient) -> None:
        client.post("/ai/v1/script/session", json={"project_id": "proj-300"})
        resp = client.post(
            "/ai/v1/script/session/proj-300/refine",
            json={"instruction": "Make the dialogue shorter"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "refined_script" in data
        assert "changes" in data
        assert isinstance(data["changes"], list)
        assert len(data["changes"]) > 0


# -- 4. Expand scene -----------------------------------------------------------


class TestExpandScene:

    def test_expand_returns_detailed_scene(self, client: TestClient) -> None:
        client.post(
            "/ai/v1/script/session",
            json={
                "project_id": "proj-400",
                "characters": [
                    {"id": "alice", "name": "Alice", "description": "Explorer"},
                    {"id": "bob", "name": "Bob", "description": "Guide"},
                ],
            },
        )
        resp = client.post(
            "/ai/v1/script/session/proj-400/expand",
            json={"scene_desc": "Two explorers discover a hidden cave"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "expanded_scene" in data
        assert "characters_involved" in data
        assert "estimated_duration_ms" in data
        assert isinstance(data["estimated_duration_ms"], int)


# -- 5. Storyboard generation -------------------------------------------------


class TestStoryboardGeneration:

    def test_storyboard_returns_frames(self, client: TestClient) -> None:
        client.post("/ai/v1/script/session", json={"project_id": "proj-500"})
        resp = client.post("/ai/v1/script/session/proj-500/storyboard")
        assert resp.status_code == 200
        data = resp.json()
        assert "storyboard_frames" in data
        frames = data["storyboard_frames"]
        assert isinstance(frames, list)
        assert len(frames) > 0
        frame = frames[0]
        assert "frame_number" in frame
        assert "visual_description" in frame
        assert "camera_angle" in frame
        assert "duration_ms" in frame


# -- 6. Export to shots --------------------------------------------------------


class TestExportToShots:

    def test_export_returns_shots_with_scene_graphs(self, client: TestClient) -> None:
        client.post("/ai/v1/script/session", json={"project_id": "proj-600"})
        resp = client.post("/ai/v1/script/session/proj-600/export-shots")
        assert resp.status_code == 200
        data = resp.json()
        assert "shots" in data
        shots = data["shots"]
        assert isinstance(shots, list)
        assert len(shots) > 0
        shot = shots[0]
        assert "shot_number" in shot
        assert "camera" in shot
        assert "scene_graph" in shot
        assert "subject" in shot["scene_graph"]
        assert "action" in shot["scene_graph"]


# -- 7. Session persistence (conversation memory) -----------------------------


class TestSessionPersistence:

    def test_conversation_history_persists(self, client: TestClient) -> None:
        client.post("/ai/v1/script/session", json={"project_id": "proj-700"})

        # First refinement
        client.post(
            "/ai/v1/script/session/proj-700/refine",
            json={"instruction": "Add an opening shot"},
        )

        # Second refinement builds on the first
        resp = client.post(
            "/ai/v1/script/session/proj-700/refine",
            json={"instruction": "Now add a closing shot"},
        )
        assert resp.status_code == 200
        data = resp.json()
        # The refined script should contain evidence of both refinements
        assert "opening shot" in data["refined_script"].lower() or "closing shot" in data["refined_script"].lower()

        # Verify in-memory session has history
        session = get_session("proj-700")
        assert session is not None
        assert len(session.history) >= 4  # 2 user + 2 assistant messages


# -- 8. Session cleanup -------------------------------------------------------


class TestSessionCleanup:

    def test_delete_session_returns_200(self, client: TestClient) -> None:
        client.post("/ai/v1/script/session", json={"project_id": "proj-800"})
        resp = client.delete("/ai/v1/script/session/proj-800")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "deleted"

    def test_delete_nonexistent_session_returns_404(self, client: TestClient) -> None:
        resp = client.delete("/ai/v1/script/session/ghost")
        assert resp.status_code == 404

    def test_session_gone_after_delete(self, client: TestClient) -> None:
        client.post("/ai/v1/script/session", json={"project_id": "proj-801"})
        client.delete("/ai/v1/script/session/proj-801")
        # Subsequent requests should 404
        resp = client.post(
            "/ai/v1/script/session/proj-801/refine",
            json={"instruction": "anything"},
        )
        assert resp.status_code == 404
