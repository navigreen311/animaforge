"""Async pytest suite for Cartoon Pro API routes (E7)."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app

BASE = "http://test"


@pytest.fixture()
def api_client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url=BASE)


# ── 1. Line controls ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_line_controls(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/cartoon/lines",
            json={
                "image_url": "https://example.com/frame.png",
                "line_weight": 2.0,
                "taper": 0.6,
                "variation": 0.5,
                "color": "#333333",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "output_url" in data
    assert data["settings_applied"]["line_weight"] == 2.0
    assert data["settings_applied"]["color"] == "#333333"


# ── 2. Fill controls ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_fill_controls(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/cartoon/fill",
            json={
                "image_url": "https://example.com/frame.png",
                "fill_style": "gradient",
                "palette": ["#FF0000", "#00FF00", "#0000FF"],
                "shading": 0.7,
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "output_url" in data
    assert "gradient" in data["output_url"]


# ── 3. Shading controls ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_shading_controls(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/cartoon/shading",
            json={
                "image_url": "https://example.com/frame.png",
                "shading_type": "rim",
                "intensity": 0.8,
                "light_dir": "bottom-right",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "output_url" in data
    assert "rim" in data["output_url"]


# ── 4. Motion principles ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_motion_principles(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/cartoon/motion-principles",
            json={
                "animation_data": "https://example.com/anim.json",
                "squash_stretch": 0.9,
                "anticipation": 0.7,
                "follow_through": 0.6,
                "ease": 0.4,
                "smear": 0.2,
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "output_url" in data
    assert data["principles_applied"]["squash_stretch"] == 0.9
    assert data["principles_applied"]["smear"] == 0.2


# ── 5. Model sheet ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_model_sheet(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.post(
            "/ai/v1/cartoon/model-sheet",
            json={
                "character_id": "char-hero",
                "views": ["front", "side", "back", "3/4"],
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "sheet_url" in data
    assert data["views"] == ["front", "side", "back", "3/4"]


# ── 6. Presets listing ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_presets_listing(api_client: AsyncClient) -> None:
    async with api_client as c:
        resp = await c.get("/ai/v1/cartoon/presets")
    assert resp.status_code == 200
    presets = resp.json()
    assert len(presets) == 6
    names = {p["name"] for p in presets}
    assert "anime_sharp" in names
    assert "disney_smooth" in names
    assert "comic_bold" in names
