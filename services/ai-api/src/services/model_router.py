from __future__ import annotations

# Blueprint routing manifest: maps each job type to the model IDs
# used for its pipeline components.
_ROUTING_MANIFEST: dict[str, dict[str, str]] = {
    "generate_video": {
        "frame_gen": "animatediff-v3",
        "upscaler": "realesrgan-x4",
        "interpolation": "rife-v4.6",
        "scene_parser": "clip-vit-l-14",
    },
    "generate_audio": {
        "tts": "xtts-v2",
        "sfx": "audiogen-medium",
        "mixer": "demucs-v4",
    },
    "generate_avatar": {
        "face_encoder": "insightface-r100",
        "style_transfer": "ip-adapter-faceid",
        "refiner": "sdxl-refiner-1.0",
    },
    "style_clone": {
        "extractor": "clip-vit-l-14",
        "encoder": "ip-adapter-sd15",
    },
    "img_to_cartoon": {
        "cartoonizer": "animeganv2",
        "style_mix": "ip-adapter-sd15",
    },
    "script_generate": {
        "llm": "llama-3-8b-instruct",
        "formatter": "animaforge-script-fmt-v1",
    },
}


def route_job(job_type: str) -> dict[str, str]:
    """Return the component-to-model mapping for *job_type*.

    Raises ``ValueError`` if the job type is unknown.
    """
    manifest = _ROUTING_MANIFEST.get(job_type)
    if manifest is None:
        raise ValueError(f"Unknown job type: {job_type}")
    return manifest
