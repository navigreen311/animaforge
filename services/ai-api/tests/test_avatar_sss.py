"""Tests for X5 subsystem 2 — subsurface scattering skin parameters.

These check the physics, not just the plumbing: melanin must darken skin,
long wavelengths must scatter further than short ones, and the dipole
reflectance must stay within [0, 1].
"""

from __future__ import annotations

import sys
from pathlib import Path

_AI_API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_AI_API_ROOT))

import numpy as np
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.avatar import router
from src.services.avatar.sss import (
    RGB_WAVELENGTHS_NM,
    baseline_absorption,
    compute_skin_profile,
    diffuse_reflectance,
    melanin_absorption,
    profile_for_skin_tone,
    reduced_scattering,
)


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


class TestTissueOptics:
    def test_melanin_absorption_falls_with_wavelength(self) -> None:
        values = melanin_absorption(np.array(RGB_WAVELENGTHS_NM))
        # 6.6e11 * L^-3.33 is monotonically decreasing: blue absorbs most.
        assert values[2] > values[1] > values[0]

    def test_melanin_absorption_matches_published_value(self) -> None:
        """Jacques 1998 gives ~230 /cm for melanosomes at 694 nm."""
        value = float(melanin_absorption(np.array([694.0]))[0])
        assert 200.0 < value < 260.0

    def test_baseline_absorption_is_positive(self) -> None:
        values = baseline_absorption(np.array(RGB_WAVELENGTHS_NM))
        assert np.all(values > 0)

    def test_reduced_scattering_falls_with_wavelength(self) -> None:
        values = reduced_scattering(np.array(RGB_WAVELENGTHS_NM))
        assert values[2] > values[1] > values[0]

    def test_reduced_scattering_at_500nm_matches_fit(self) -> None:
        assert float(reduced_scattering(np.array([500.0]))[0]) == pytest.approx(
            4.6, rel=1e-6
        )

    def test_diffuse_reflectance_bounded(self) -> None:
        absorption = np.array([0.01, 0.5, 5.0])
        scattering = np.array([5.0, 5.0, 5.0])
        values = diffuse_reflectance(absorption, scattering)
        assert np.all(values >= 0.0)
        assert np.all(values <= 1.0)

    def test_reflectance_falls_as_absorption_rises(self) -> None:
        scattering = np.array([5.0])
        low = diffuse_reflectance(np.array([0.05]), scattering)[0]
        high = diffuse_reflectance(np.array([2.0]), scattering)[0]
        assert low > high


class TestSkinProfile:
    def test_more_melanin_darkens_skin(self) -> None:
        light = compute_skin_profile(melanin_fraction=0.02)
        dark = compute_skin_profile(melanin_fraction=0.40)
        assert sum(dark.diffuse_reflectance) < sum(light.diffuse_reflectance)

    def test_red_scatters_furthest(self) -> None:
        """Long wavelengths penetrate deepest — why skin reads red in SSS."""
        profile = compute_skin_profile()
        r, g, b = profile.diffusion_length_mm
        assert r > g > b

    def test_scatter_radius_clamped_to_thickness(self) -> None:
        profile = compute_skin_profile(thickness_mm=0.4)
        assert all(v <= 0.4 + 1e-9 for v in profile.scatter_radius_mm)

    def test_albedo_within_unit_range(self) -> None:
        profile = compute_skin_profile()
        assert all(0.0 <= v <= 1.0 for v in profile.single_scattering_albedo)
        assert all(0.0 <= v <= 1.0 for v in profile.surface_albedo_srgb)

    def test_haemoglobin_reddens_skin(self) -> None:
        pale = compute_skin_profile(haemoglobin_fraction=0.002)
        flushed = compute_skin_profile(haemoglobin_fraction=0.05)
        # Haemoglobin absorbs green far more than red, so R/G reflectance rises.
        pale_ratio = pale.diffuse_reflectance[0] / pale.diffuse_reflectance[1]
        flushed_ratio = flushed.diffuse_reflectance[0] / flushed.diffuse_reflectance[1]
        assert flushed_ratio > pale_ratio

    def test_rejects_out_of_range_fractions(self) -> None:
        with pytest.raises(ValueError, match="melanin_fraction"):
            compute_skin_profile(melanin_fraction=1.5)
        with pytest.raises(ValueError, match="thickness_mm"):
            compute_skin_profile(thickness_mm=0.0)

    def test_three_channels_everywhere(self) -> None:
        profile = compute_skin_profile().as_dict()
        for key in (
            "absorption_mm_inv",
            "reduced_scattering_mm_inv",
            "diffuse_reflectance",
            "diffusion_length_mm",
            "scatter_radius_mm",
        ):
            assert len(profile[key]) == 3, key


class TestSkinToneMapping:
    def test_dark_swatch_yields_more_melanin(self) -> None:
        light = profile_for_skin_tone("#FDDBB4")
        dark = profile_for_skin_tone("#3B1F0B")
        assert dark.melanin_fraction > light.melanin_fraction

    def test_dark_swatch_reflects_less(self) -> None:
        light = profile_for_skin_tone("#FDDBB4")
        dark = profile_for_skin_tone("#3B1F0B")
        assert sum(dark.diffuse_reflectance) < sum(light.diffuse_reflectance)

    def test_shorthand_hex_accepted(self) -> None:
        assert profile_for_skin_tone("#c84").melanin_fraction > 0

    def test_rejects_malformed_hex(self) -> None:
        with pytest.raises(ValueError, match="RRGGBB"):
            profile_for_skin_tone("not-a-colour")


class TestSkinEndpoint:
    def test_returns_profile_for_tone(self, client: TestClient) -> None:
        resp = client.post("/ai/v1/avatar/skin", json={"skin_tone": "#C68642"})
        assert resp.status_code == 200
        assert len(resp.json()["diffusion_length_mm"]) == 3

    def test_returns_profile_for_explicit_parameters(
        self, client: TestClient
    ) -> None:
        resp = client.post(
            "/ai/v1/avatar/skin",
            json={"melanin_fraction": 0.3, "haemoglobin_fraction": 0.01},
        )
        assert resp.status_code == 200
        assert resp.json()["melanin_fraction"] == pytest.approx(0.3)

    def test_rejects_bad_colour(self, client: TestClient) -> None:
        resp = client.post("/ai/v1/avatar/skin", json={"skin_tone": "zzz"})
        assert resp.status_code == 422
