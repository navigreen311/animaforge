"""Tests for Cartoon Pro controls (E7) endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.mark.asyncio
async def test_line_controls():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/v1/cartoon/lines",
            json={
                "image_url": "https://example.com/image.png",
                "line_weight": 1.5,
                "taper": 0.7,
                "variation": 0.4,
                "color": "#FF0000",
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert "output_url" in data
    assert data["settings_applied"]["line_weight"] == 1.5
    assert data["settings_applied"]["color"] == "#FF0000"


@pytest.mark.asyncio
async def test_fill_controls():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/v1/cartoon/fill",
            json={
                "image_url": "https://example.com/image.png",
                "fill_style": "cel",
                "palette": ["#FF0000", "#00FF00"],
                "shading": 0.8,
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert "output_url" in data
    assert "cel" in data["output_url"]


@pytest.mark.asyncio
async def test_shading_controls():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/v1/cartoon/shading",
            json={
                "image_url": "https://example.com/image.png",
                "shading_type": "crosshatch",
                "intensity": 0.6,
                "light_dir": "top-right",
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert "output_url" in data
    assert "crosshatch" in data["output_url"]


@pytest.mark.asyncio
async def test_motion_principles():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/v1/cartoon/motion-principles",
            json={
                "animation_data": "https://example.com/anim.json",
                "squash_stretch": 0.8,
                "anticipation": 0.6,
                "follow_through": 0.7,
                "ease": 0.5,
                "smear": 0.3,
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert "output_url" in data
    assert data["principles_applied"]["squash_stretch"] == 0.8
    assert data["principles_applied"]["smear"] == 0.3


@pytest.mark.asyncio
async def test_model_sheet():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/v1/cartoon/model-sheet",
            json={
                "character_id": "char_001",
                "views": ["front", "side", "back"],
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert "sheet_url" in data
    assert data["views"] == ["front", "side", "back"]


@pytest.mark.asyncio
async def test_batch_style():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/v1/cartoon/batch-style",
            json={
                "image_urls": [
                    "https://example.com/img1.png",
                    "https://example.com/img2.png",
                ],
                "style_config": {"preset": "anime_sharp"},
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert len(data["outputs"]) == 2
    assert 0.0 <= data["consistency_score"] <= 1.0


@pytest.mark.asyncio
async def test_get_presets():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/ai/v1/cartoon/presets")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 6
    names = {p["name"] for p in data}
    assert "anime_sharp" in names
    assert "disney_smooth" in names
    assert "comic_bold" in names
    assert "watercolor_soft" in names
    assert "pixel_retro" in names
    assert "chibi_cute" in names


@pytest.mark.asyncio
async def test_adjust_proportions():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/v1/cartoon/proportions",
            json={
                "character_id": "char_002",
                "head_ratio": 2.0,
                "eye_size": 1.5,
                "limb_length": 0.8,
                "body_type": "chibi",
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert "adjusted_character_url" in data
    assert "char_002" in data["adjusted_character_url"]
