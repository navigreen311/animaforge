import os
import json
import hashlib
from typing import AsyncIterator

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")


async def stream_script_generation(
    scene_desc: str,
    world_bible: dict = None,
    characters: list = None,
) -> AsyncIterator[str]:
    """Stream-generate an animation script from a scene description.

    Uses the Anthropic API when a valid key is configured, otherwise falls
    back to a deterministic mock so the endpoint always works in dev.
    """
    if ANTHROPIC_API_KEY and not ANTHROPIC_API_KEY.startswith("YOUR_"):
        import httpx

        system_prompt = (
            "You are AnimaForge's AI Script Writer. "
            "Write production animation scripts."
        )
        user_content = f"Write a script for: {scene_desc}"
        if world_bible:
            user_content += f"\n\nWorld Bible: {json.dumps(world_bible)}"
        if characters:
            user_content += f"\n\nCharacters: {json.dumps(characters)}"

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-6",
                    "max_tokens": 4096,
                    "stream": True,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_content}],
                },
                timeout=120.0,
            ) as response:
                accumulated = ""
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            data = json.loads(line[6:])
                            if data.get("type") == "content_block_delta":
                                text = data["delta"].get("text", "")
                                accumulated += text
                                yield json.dumps(
                                    {"type": "content_delta", "text": text}
                                )
                        except Exception:
                            pass
                yield json.dumps({"type": "complete", "script": accumulated})
                return

    # Mock fallback for development / testing
    chunks = [
        f"INT. STUDIO - DAY\n\n",
        f"{scene_desc}\n\n",
        "CHARACTER 1\n",
        "Let's begin.\n\n",
        "CHARACTER 2\n",
        "I'm ready.\n\n",
        "[END]",
    ]
    for chunk in chunks:
        yield json.dumps({"type": "content_delta", "text": chunk})
    yield json.dumps({"type": "complete", "script": "".join(chunks)})


async def stream_dialogue_rewrite(
    original: str,
    character: str,
    style: str,
) -> AsyncIterator[str]:
    """Rewrite dialogue for a specific character in a given style."""
    yield json.dumps(
        {
            "type": "content_delta",
            "text": f"[{character.upper()}]\n({style} style)\n{original}",
        }
    )
    yield json.dumps({"type": "complete"})
