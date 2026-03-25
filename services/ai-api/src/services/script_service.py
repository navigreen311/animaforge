"""Service layer for AI script generation (G1 pipeline)."""

from __future__ import annotations


def generate_script(
    project_id: str,
    scene_desc: str,
    char_ids: list[str] | None = None,
) -> dict:
    """Generate a script with shot breakdown and scene graphs from a scene description.

    In production this would delegate to a large-language-model pipeline (G1);
    for now it returns a deterministic mock so the API contract is exercisable
    end-to-end.
    """
    characters = char_ids or ["char-default"]

    script_text = (
        f"[Project {project_id}]\n"
        f"SCENE: {scene_desc}\n\n"
        f"INT. STUDIO - DAY\n\n"
        f"{characters[0].upper()} enters the frame.\n"
        f"{characters[0].upper()}: (determined) We need to make this work.\n\n"
        f"Camera pushes in slowly as tension builds.\n"
    )

    shot_breakdown = [
        {
            "shot_number": 1,
            "description": f"Wide establishing shot - {scene_desc[:60]}",
            "duration_ms": 3000,
            "camera": "wide",
        },
        {
            "shot_number": 2,
            "description": f"Medium close-up on {characters[0]}",
            "duration_ms": 2500,
            "camera": "medium_closeup",
        },
        {
            "shot_number": 3,
            "description": "Over-the-shoulder reaction shot",
            "duration_ms": 2000,
            "camera": "ots",
        },
    ]

    scene_graphs = [
        {
            "subject": characters[0],
            "camera": {"angle": "eye_level", "movement": "push_in"},
            "action": "enters",
            "emotion": "determined",
            "timing": {"duration_ms": 3000, "pacing": "moderate"},
            "dialogue": "We need to make this work.",
        },
        {
            "subject": characters[0],
            "camera": {"angle": "low", "movement": "static"},
            "action": "reacts",
            "emotion": "contemplative",
            "timing": {"duration_ms": 2500, "pacing": "slow"},
            "dialogue": None,
        },
    ]

    return {
        "script": script_text,
        "shot_breakdown": shot_breakdown,
        "scene_graphs": scene_graphs,
    }
