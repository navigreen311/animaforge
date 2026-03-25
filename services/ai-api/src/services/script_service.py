import os
import json
import httpx
from typing import Optional

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-6"


async def generate_script(
    project_id: str, scene_desc: str, char_ids: Optional[list] = None
) -> dict:
    """Generate a script using Claude API with structured output."""

    system_prompt = (
        "You are AnimaForge's AI Script Writer. Generate production-ready"
        " animation scripts.\n\n"
        "Output a JSON object with:\n"
        "- script: Full script text with character names, dialogue, and action"
        " descriptions\n"
        "- shot_breakdown: Array of shots, each with: shot_number, description,"
        " duration_ms, camera (angle, movement)\n"
        "- scene_graphs: Array matching shots, each with: subject,"
        " camera{angle,movement}, action, emotion, timing{duration_ms,pacing},"
        " dialogue\n\n"
        "Keep shots between 3-10 seconds. Use cinematic camera language."
        " Make dialogue natural."
    )

    user_prompt = f"Scene description: {scene_desc}"
    if char_ids:
        user_prompt += f"\nCharacters involved: {', '.join(char_ids)}"

    # Try Claude API, fall back to mock
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
                content = result["content"][0]["text"]
                # Try to parse JSON from response
                return parse_script_response(content, scene_desc)
        except Exception as e:
            print(f"Claude API error, falling back to mock: {e}")

    return generate_mock_script(scene_desc, char_ids)


def parse_script_response(content: str, scene_desc: str) -> dict:
    """Parse Claude's response into structured script data."""
    import re

    try:
        # Try direct JSON parse
        data = json.loads(content)
        return data
    except json.JSONDecodeError:
        # Extract JSON from markdown code block
        json_match = re.search(r"```json\s*(.*?)\s*```", content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
        # Return as plain text script
        return {"script": content, "shot_breakdown": [], "scene_graphs": []}


def generate_mock_script(scene_desc: str, char_ids: Optional[list] = None) -> dict:
    """Fallback mock script generation."""
    return {
        "script": (
            f"INT. STUDIO - DAY\n\n{scene_desc}\n\n[Characters enter scene]"
            "\n\nCHARACTER 1\nLet's begin.\n\nCHARACTER 2\nI'm ready."
            "\n\n[Action sequence follows]"
        ),
        "shot_breakdown": [
            {"shot_number": 1, "description": "Establishing wide shot", "duration_ms": 3000, "camera": {"angle": "wide", "movement": "static"}},
            {"shot_number": 2, "description": "Medium shot - dialogue", "duration_ms": 5000, "camera": {"angle": "medium", "movement": "dolly_in"}},
            {"shot_number": 3, "description": "Close-up reaction", "duration_ms": 2000, "camera": {"angle": "close_up", "movement": "static"}},
            {"shot_number": 4, "description": "Action sequence", "duration_ms": 8000, "camera": {"angle": "dynamic", "movement": "tracking"}},
        ],
        "scene_graphs": [
            {"subject": "environment", "camera": {"angle": "wide", "movement": "static"}, "action": "establish", "emotion": "neutral", "timing": {"duration_ms": 3000, "pacing": "slow"}, "dialogue": None},
            {"subject": "characters", "camera": {"angle": "medium", "movement": "dolly_in"}, "action": "dialogue", "emotion": "determined", "timing": {"duration_ms": 5000, "pacing": "normal"}, "dialogue": "Let's begin."},
            {"subject": "character_2", "camera": {"angle": "close_up", "movement": "static"}, "action": "react", "emotion": "ready", "timing": {"duration_ms": 2000, "pacing": "normal"}, "dialogue": "I'm ready."},
            {"subject": "all", "camera": {"angle": "dynamic", "movement": "tracking"}, "action": "action_sequence", "emotion": "intense", "timing": {"duration_ms": 8000, "pacing": "fast"}, "dialogue": None},
        ],
    }
