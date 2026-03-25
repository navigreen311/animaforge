"""Tests for Style Intelligence X6b endpoints and service logic."""

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app
from src.services.style_intelligence import (
    blend_fingerprints,
    clear_presets,
    compare_fingerprints,
    extract_animation_fingerprint,
    extract_video_fingerprint,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_fingerprint_payload(**overrides):
    """Return a minimal valid StyleFingerprint dict for request bodies."""
    base = {
        "color_palette": ["#FF0000", "#00FF00", "#0000FF"],
        "contrast_profile": "high",
        "grain_noise": 0.4,
        "saturation_curve": "warm-shift",
        "lens_character": "anamorphic",
        "depth_of_field": "shallow",
        "camera_motion": "steadicam",
        "line_weight": "medium",
        "fill_style": "gradient",
        "shading_approach": "soft",
        "source_url": "https://example.com/src.mp4",
        "source_type": "video",
        "confidence": 0.9,
        "created_at": "2026-01-01T00:00:00Z",
    }
    base.update(overrides)
    return base


@pytest.fixture(autouse=True)
def _reset_presets():
    """Clear the in-memory preset store between tests."""
    clear_presets()
    yield
    clear_presets()


# ---------------------------------------------------------------------------
# 1. Video fingerprint extraction
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_video_fingerprint_extraction():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/ai/v1/style/fingerprint/video",
            json={"video_url": "https://example.com/film.mp4"},
        )
    assert resp.status_code == 200
    data = resp.json()
    fp = data["fingerprint"]
    assert isinstance(fp["color_palette"], list)
    assert len(fp["color_palette"]) == 5
    assert 0.0 <= fp["grain_noise"] <= 1.0
    assert fp["source_type"] == "video"


# ---------------------------------------------------------------------------
# 2. Animation fingerprint extraction
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_animation_fingerprint_extraction():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/ai/v1/style/fingerprint/animation",
            json={"video_url": "https://example.com/anim.mp4"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "fingerprint" in data
    meta = data["animation_meta"]
    assert "motion_principles" in meta
    assert "squash_stretch" in meta["motion_principles"]
    assert "timing_style" in meta
    assert "char_proportions" in meta


# ---------------------------------------------------------------------------
# 3. Compare fingerprints
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_compare_identical_fingerprints():
    fp = _make_fingerprint_payload()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/ai/v1/style/compare",
            json={"fingerprint_a": fp, "fingerprint_b": fp},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["similarity"] == 1.0
    assert all(v == 1.0 for v in data["dimension_scores"].values())


# ---------------------------------------------------------------------------
# 4. Compare different fingerprints
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_compare_different_fingerprints():
    fp_a = _make_fingerprint_payload()
    fp_b = _make_fingerprint_payload(
        contrast_profile="low",
        grain_noise=0.9,
        color_palette=["#111111"],
        lens_character="vintage",
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/ai/v1/style/compare",
            json={"fingerprint_a": fp_a, "fingerprint_b": fp_b},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert 0.0 <= data["similarity"] < 1.0


# ---------------------------------------------------------------------------
# 5. Blend fingerprints
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_blend_fingerprints():
    fp = _make_fingerprint_payload()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/ai/v1/style/blend",
            json={"fingerprints": [fp, fp], "weights": [0.6, 0.4]},
        )
    assert resp.status_code == 200
    blended = resp.json()["blended_fingerprint"]
    assert blended["source_type"] == "blend"
    assert 0.0 <= blended["grain_noise"] <= 1.0


# ---------------------------------------------------------------------------
# 6. Style transfer
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_style_transfer():
    fp = _make_fingerprint_payload()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/ai/v1/style/transfer",
            json={
                "content_url": "https://example.com/raw.mp4",
                "fingerprint": fp,
                "strength": 0.7,
                "preserve_content": 0.6,
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["strength"] == 0.7
    assert "output_url" in data


# ---------------------------------------------------------------------------
# 7. Create preset
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_and_list_preset():
    fp = _make_fingerprint_payload()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/ai/v1/style/preset",
            json={"name": "cinematic_noir", "fingerprint": fp},
        )
    assert resp.status_code == 200
    preset = resp.json()
    assert preset["name"] == "cinematic_noir"
    assert len(preset["variations"]) == 4  # default variations

    # List presets
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/ai/v1/style/presets")
    assert resp.status_code == 200
    presets = resp.json()
    assert len(presets) == 1
    assert presets[0]["preset_id"] == preset["preset_id"]


# ---------------------------------------------------------------------------
# 8. Style evolution analysis
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_style_evolution():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/ai/v1/style/evolution/proj_abc123")
    assert resp.status_code == 200
    data = resp.json()
    assert data["project_id"] == "proj_abc123"
    assert data["total_shots"] >= 5
    assert "consistency_grade" in data
    assert data["consistency_grade"] in ("A", "B", "C", "D")
    assert len(data["shots"]) == data["total_shots"]


# ---------------------------------------------------------------------------
# 9. Style corrections
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_style_corrections():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/ai/v1/style/corrections/proj_abc123")
    assert resp.status_code == 200
    data = resp.json()
    assert data["project_id"] == "proj_abc123"
    assert "corrections_needed" in data
    assert "overall_health" in data
    assert data["overall_health"] in ("good", "fair", "needs_attention")


# ---------------------------------------------------------------------------
# 10. Service-level: deterministic fingerprint from same URL
# ---------------------------------------------------------------------------


def test_video_fingerprint_is_deterministic():
    url = "https://example.com/same_video.mp4"
    fp1 = extract_video_fingerprint(url)
    fp2 = extract_video_fingerprint(url)
    assert fp1.color_palette == fp2.color_palette
    assert fp1.contrast_profile == fp2.contrast_profile
    assert fp1.grain_noise == fp2.grain_noise
    assert fp1.lens_character == fp2.lens_character
