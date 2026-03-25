"""Tests for style clone and image-to-cartoon endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


# -- Style Clone ---------------------------------------------------------------


@pytest.mark.asyncio
async def test_style_clone_returns_fingerprint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/v1/style/clone",
            json={
                "source_url": "https://example.com/film.mp4",
                "source_type": "film",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert "style_pack_id" in data
    assert len(data["style_pack_id"]) == 16

    fp = data["fingerprint"]
    assert isinstance(fp["color_palette"], list)
    assert len(fp["color_palette"]) > 0
    assert fp["contrast_profile"] == "high"
    assert 0.0 <= fp["grain_noise"] <= 1.0
    assert fp["saturation_curve"] == "warm-shift"
    assert fp["lens_character"] == "anamorphic"
    assert fp["depth_of_field"] == "shallow"
    assert fp["camera_motion"] == "steadicam"
    assert fp["line_weight"] == "medium"
    assert fp["fill_style"] == "gradient"
    assert fp["shading_approach"] == "soft"
    assert fp["source_url"] == "https://example.com/film.mp4"
    assert fp["source_type"] == "film"
    assert 0.0 <= fp["confidence"] <= 1.0
    assert "created_at" in fp


@pytest.mark.asyncio
async def test_style_clone_validates_missing_fields():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/ai/v1/style/clone", json={})

    assert response.status_code == 422


# -- Image-to-Cartoon ----------------------------------------------------------


@pytest.mark.asyncio
async def test_img_to_cartoon_returns_job():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/v1/convert/img-to-cartoon",
            json={
                "image_url": "https://example.com/photo.jpg",
                "style": "ghibli",
                "strength": 0.75,
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert len(data["job_id"]) == 16
    assert "output_url" in data
    assert "ghibli" in data["output_url"]
    assert "s0.75" in data["output_url"]

    stages = data["stages_completed"]
    assert len(stages) == 7

    expected_stages = [
        "subject_detection",
        "line_extraction",
        "color_segmentation",
        "style_application",
        "toon_blend",
        "character_extraction",
        "consistency_lock",
    ]
    for stage, expected_name in zip(stages, expected_stages):
        assert stage["name"] == expected_name
        assert stage["status"] == "completed"
        assert stage["duration_ms"] > 0


@pytest.mark.asyncio
async def test_img_to_cartoon_validates_strength_range():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/v1/convert/img-to-cartoon",
            json={
                "image_url": "https://example.com/photo.jpg",
                "style": "anime",
                "strength": 1.5,
            },
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_img_to_cartoon_validates_missing_fields():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/ai/v1/convert/img-to-cartoon", json={})

    assert response.status_code == 422
