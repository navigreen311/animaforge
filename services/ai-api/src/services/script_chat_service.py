"""Iterative script assistant with conversation memory and streaming support.

Provides ScriptSession for maintaining per-project conversation context,
plus an in-memory session store for lifecycle management.
"""

from __future__ import annotations

import json
import os
import re
from typing import Optional

import httpx

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-6"

# ---------------------------------------------------------------------------
# ScriptSession – per-project conversation memory
# ---------------------------------------------------------------------------


class ScriptSession:
    """Maintains conversation history and context for an animation project."""

    def __init__(
        self,
        project_id: str,
        world_bible: Optional[str] = None,
        characters: Optional[list[dict]] = None,
    ) -> None:
        self.project_id = project_id
        self.world_bible = world_bible
        self.characters = characters or []
        self.history: list[dict[str, str]] = []
        self.current_script: Optional[str] = None

    # -- history helpers ----------------------------------------------------

    def add_message(self, role: str, content: str) -> None:
        """Append a message to the conversation history."""
        self.history.append({"role": role, "content": content})

    def get_context(self) -> str:
        """Return formatted context string (world bible + characters + history)."""
        parts: list[str] = []
        if self.world_bible:
            parts.append(f"## World Bible\n{self.world_bible}")
        if self.characters:
            char_lines = "\n".join(
                f"- {c.get('name', c.get('id', 'unknown'))}: {c.get('description', '')}"
                for c in self.characters
            )
            parts.append(f"## Characters\n{char_lines}")
        if self.current_script:
            parts.append(f"## Current Script\n{self.current_script}")
        if self.history:
            history_lines = "\n".join(
                f"[{m['role']}]: {m['content']}" for m in self.history[-20:]
            )
            parts.append(f"## Conversation History\n{history_lines}")
        return "\n\n".join(parts)

    # -- Claude API helpers -------------------------------------------------

    async def _call_claude(self, system_prompt: str, user_prompt: str) -> str:
        """Call Claude API with system + user prompt. Falls back to mock."""
        if ANTHROPIC_API_KEY:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "x-api-key": ANTHROPIC_API_KEY,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json",
                        },
                        json={
                            "model": CLAUDE_MODEL,
                            "max_tokens": 4096,
                            "system": system_prompt,
                            "messages": [{"role": "user", "content": user_prompt}],
                        },
                        timeout=60.0,
                    )
                    response.raise_for_status()
                    result = response.json()
                    return result["content"][0]["text"]
            except Exception as e:
                print(f"Claude API error, falling back to mock: {e}")
        return ""

    @staticmethod
    def _parse_json_or_text(text: str) -> dict:
        """Attempt to parse JSON from raw text or markdown code block."""
        try:
            return json.loads(text)
        except (json.JSONDecodeError, TypeError):
            match = re.search(r"```json\s*(.*?)\s*```", text or "", re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError:
                    pass
        return {}

    # -- core actions -------------------------------------------------------

    async def refine_script(self, instruction: str) -> dict:
        """Refine the current script based on an instruction.

        Returns dict with ``refined_script`` and ``changes`` list.
        """
        context = self.get_context()
        system_prompt = (
            "You are AnimaForge's AI Script Editor. You refine animation scripts "
            "iteratively based on user instructions.\n\n"
            "Given the project context and current script, apply the requested "
            "changes and return a JSON object with:\n"
            '- "refined_script": the full updated script text\n'
            '- "changes": array of strings describing each change made\n\n'
            f"Project Context:\n{context}"
        )
        user_prompt = f"Refinement instruction: {instruction}"

        self.add_message("user", instruction)
        raw = await self._call_claude(system_prompt, user_prompt)

        if raw:
            parsed = self._parse_json_or_text(raw)
            if parsed.get("refined_script"):
                self.current_script = parsed["refined_script"]
                self.add_message("assistant", raw)
                return parsed

        # Mock fallback
        refined = self.current_script or "INT. STUDIO - DAY\n\n[Refined scene]"
        refined += f"\n\n[Applied: {instruction}]"
        self.current_script = refined
        result = {"refined_script": refined, "changes": [f"Applied: {instruction}"]}
        self.add_message("assistant", json.dumps(result))
        return result

    async def expand_scene(self, scene_desc: str) -> dict:
        """Generate a detailed scene expansion from a brief description."""
        context = self.get_context()
        system_prompt = (
            "You are AnimaForge's AI Scene Expander. Given a brief scene "
            "description and project context, produce a richly detailed scene.\n\n"
            "Return a JSON object with:\n"
            '- "expanded_scene": full detailed scene text with action, dialogue, '
            "and stage directions\n"
            '- "characters_involved": array of character names/ids present\n'
            '- "estimated_duration_ms": estimated duration in milliseconds\n\n'
            f"Project Context:\n{context}"
        )
        user_prompt = f"Scene to expand: {scene_desc}"

        self.add_message("user", f"Expand scene: {scene_desc}")
        raw = await self._call_claude(system_prompt, user_prompt)

        if raw:
            parsed = self._parse_json_or_text(raw)
            if parsed.get("expanded_scene"):
                self.add_message("assistant", raw)
                return parsed

        # Mock fallback
        result = {
            "expanded_scene": (
                f"INT. SCENE - DAY\n\n"
                f"{scene_desc}\n\n"
                "The camera pans slowly across the environment, revealing details.\n"
                "Characters exchange meaningful glances before speaking.\n\n"
                "CHARACTER 1\n(thoughtfully)\nThis changes everything.\n\n"
                "[Beat]\n\n"
                "CHARACTER 2\nAgreed. Let's move forward."
            ),
            "characters_involved": [
                c.get("id", c.get("name", "unknown")) for c in self.characters[:2]
            ]
            or ["character_1", "character_2"],
            "estimated_duration_ms": 8000,
        }
        self.add_message("assistant", json.dumps(result))
        return result

    async def rewrite_dialogue(self, char_id: str, style: str) -> dict:
        """Rewrite dialogue for a specific character in a given voice/style."""
        context = self.get_context()
        system_prompt = (
            "You are AnimaForge's Dialogue Specialist. Rewrite all dialogue for "
            f"character '{char_id}' in the style: {style}.\n\n"
            "Return a JSON object with:\n"
            '- "rewritten_script": the full script with updated dialogue\n'
            '- "lines_changed": number of dialogue lines modified\n\n'
            f"Project Context:\n{context}"
        )
        user_prompt = f"Rewrite dialogue for {char_id} in style: {style}"

        self.add_message("user", user_prompt)
        raw = await self._call_claude(system_prompt, user_prompt)

        if raw:
            parsed = self._parse_json_or_text(raw)
            if parsed.get("rewritten_script"):
                self.current_script = parsed["rewritten_script"]
                self.add_message("assistant", raw)
                return parsed

        # Mock fallback
        script = self.current_script or "INT. STUDIO - DAY\n\nCHARACTER 1\nHello."
        result = {
            "rewritten_script": script + f"\n[Dialogue rewritten for {char_id} in {style} style]",
            "lines_changed": 2,
        }
        self.current_script = result["rewritten_script"]
        self.add_message("assistant", json.dumps(result))
        return result

    async def generate_storyboard_descriptions(self, script: str) -> dict:
        """Convert a script into visual storyboard frame descriptions."""
        context = self.get_context()
        system_prompt = (
            "You are AnimaForge's Storyboard Artist. Convert the given script into "
            "visual storyboard frame descriptions suitable for image generation.\n\n"
            "Return a JSON object with:\n"
            '- "storyboard_frames": array of objects, each with:\n'
            '  - "frame_number": integer\n'
            '  - "visual_description": detailed visual prompt\n'
            '  - "camera_angle": camera angle description\n'
            '  - "duration_ms": estimated duration\n'
            '  - "dialogue_overlay": any dialogue text for the frame (or null)\n\n'
            f"Project Context:\n{context}"
        )
        user_prompt = f"Script to storyboard:\n{script}"

        self.add_message("user", "Generate storyboard for script")
        raw = await self._call_claude(system_prompt, user_prompt)

        if raw:
            parsed = self._parse_json_or_text(raw)
            if parsed.get("storyboard_frames"):
                self.add_message("assistant", raw)
                return parsed

        # Mock fallback
        result = {
            "storyboard_frames": [
                {
                    "frame_number": 1,
                    "visual_description": "Wide establishing shot of the scene environment",
                    "camera_angle": "wide",
                    "duration_ms": 3000,
                    "dialogue_overlay": None,
                },
                {
                    "frame_number": 2,
                    "visual_description": "Medium shot of characters facing each other",
                    "camera_angle": "medium",
                    "duration_ms": 4000,
                    "dialogue_overlay": "Character dialogue begins",
                },
                {
                    "frame_number": 3,
                    "visual_description": "Close-up on character reaction, emotion visible",
                    "camera_angle": "close_up",
                    "duration_ms": 2000,
                    "dialogue_overlay": None,
                },
                {
                    "frame_number": 4,
                    "visual_description": "Dynamic tracking shot following action sequence",
                    "camera_angle": "tracking",
                    "duration_ms": 5000,
                    "dialogue_overlay": None,
                },
            ]
        }
        self.add_message("assistant", json.dumps(result))
        return result

    async def export_to_shots(self, script: str) -> dict:
        """Parse a script into a shot breakdown with scene graphs."""
        context = self.get_context()
        system_prompt = (
            "You are AnimaForge's Shot Planner. Parse the given script into a "
            "production-ready shot breakdown.\n\n"
            "Return a JSON object with:\n"
            '- "shots": array of objects, each with:\n'
            '  - "shot_number": integer\n'
            '  - "description": shot description\n'
            '  - "duration_ms": duration in milliseconds\n'
            '  - "camera": {angle, movement}\n'
            '  - "scene_graph": {subject, action, emotion, dialogue}\n\n'
            f"Project Context:\n{context}"
        )
        user_prompt = f"Script to break into shots:\n{script}"

        self.add_message("user", "Export script to shots")
        raw = await self._call_claude(system_prompt, user_prompt)

        if raw:
            parsed = self._parse_json_or_text(raw)
            if parsed.get("shots"):
                self.add_message("assistant", raw)
                return parsed

        # Mock fallback
        result = {
            "shots": [
                {
                    "shot_number": 1,
                    "description": "Establishing wide shot",
                    "duration_ms": 3000,
                    "camera": {"angle": "wide", "movement": "static"},
                    "scene_graph": {
                        "subject": "environment",
                        "action": "establish",
                        "emotion": "neutral",
                        "dialogue": None,
                    },
                },
                {
                    "shot_number": 2,
                    "description": "Medium dialogue shot",
                    "duration_ms": 5000,
                    "camera": {"angle": "medium", "movement": "dolly_in"},
                    "scene_graph": {
                        "subject": "characters",
                        "action": "dialogue",
                        "emotion": "engaged",
                        "dialogue": "Opening line",
                    },
                },
                {
                    "shot_number": 3,
                    "description": "Close-up reaction",
                    "duration_ms": 2000,
                    "camera": {"angle": "close_up", "movement": "static"},
                    "scene_graph": {
                        "subject": "character",
                        "action": "react",
                        "emotion": "surprised",
                        "dialogue": None,
                    },
                },
            ]
        }
        self.add_message("assistant", json.dumps(result))
        return result


# ---------------------------------------------------------------------------
# In-memory session store
# ---------------------------------------------------------------------------

_sessions: dict[str, ScriptSession] = {}


def create_session(
    project_id: str,
    world_bible: Optional[str] = None,
    characters: Optional[list[dict]] = None,
) -> ScriptSession:
    """Create and store a new ScriptSession for a project."""
    session = ScriptSession(project_id, world_bible, characters)
    _sessions[project_id] = session
    return session


def get_session(project_id: str) -> Optional[ScriptSession]:
    """Retrieve an existing session by project ID."""
    return _sessions.get(project_id)


def delete_session(project_id: str) -> bool:
    """Remove a session from the store. Returns True if it existed."""
    return _sessions.pop(project_id, None) is not None


def clear_all_sessions() -> None:
    """Remove all sessions (useful for testing)."""
    _sessions.clear()
