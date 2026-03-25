import pytest

from src.services.model_router import route_job


def test_route_generate_video():
    models = route_job("generate_video")
    assert "frame_gen" in models
    assert models["frame_gen"] == "animatediff-v3"
    assert "upscaler" in models
    assert "interpolation" in models
    assert "scene_parser" in models


def test_route_generate_audio():
    models = route_job("generate_audio")
    assert models["tts"] == "xtts-v2"
    assert "sfx" in models
    assert "mixer" in models


def test_route_generate_avatar():
    models = route_job("generate_avatar")
    assert "face_encoder" in models
    assert "style_transfer" in models
    assert "refiner" in models


def test_route_style_clone():
    models = route_job("style_clone")
    assert "extractor" in models
    assert "encoder" in models


def test_route_img_to_cartoon():
    models = route_job("img_to_cartoon")
    assert "cartoonizer" in models
    assert models["cartoonizer"] == "animeganv2"


def test_route_script_generate():
    models = route_job("script_generate")
    assert models["llm"] == "llama-3-8b-instruct"
    assert "formatter" in models


def test_route_unknown_job_type_raises():
    with pytest.raises(ValueError, match="Unknown job type"):
        route_job("nonexistent_type")
