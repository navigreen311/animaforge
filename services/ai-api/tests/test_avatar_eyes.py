"""Tests for X5 subsystem 4 — the eye system.

Asserts that the simulation produces an actual animation curve and that the
curve obeys the physiology it claims to model: the saccadic main sequence,
plausible blink rates and waveform asymmetry, and a pupil light reflex.
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
from src.services.avatar.eyes import (
    BLINK_CLOSING_S,
    BLINK_OPENING_S,
    GAZE_LIMIT_PITCH_DEG,
    GAZE_LIMIT_YAW_DEG,
    SACCADE_PEAK_VELOCITY_MAX,
    blink_waveform,
    saccade_duration,
    saccade_peak_velocity,
    simulate_eyes,
    steady_state_pupil_diameter,
)


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


class TestMainSequence:
    def test_peak_velocity_rises_with_amplitude(self) -> None:
        assert saccade_peak_velocity(2) < saccade_peak_velocity(10)
        assert saccade_peak_velocity(10) < saccade_peak_velocity(30)

    def test_peak_velocity_saturates(self) -> None:
        assert saccade_peak_velocity(100) < SACCADE_PEAK_VELOCITY_MAX

    def test_five_degree_saccade_matches_literature(self) -> None:
        """A 5 deg saccade runs ~200-300 deg/s over ~30-40 ms."""
        assert 200.0 < saccade_peak_velocity(5) < 300.0
        assert 0.025 < saccade_duration(5) < 0.045

    def test_twenty_degree_saccade_matches_literature(self) -> None:
        """A 20 deg saccade runs ~500-650 deg/s over ~55-80 ms."""
        assert 500.0 < saccade_peak_velocity(20) < 650.0
        assert 0.050 < saccade_duration(20) < 0.080

    def test_duration_rises_with_amplitude(self) -> None:
        assert saccade_duration(5) < saccade_duration(20) < saccade_duration(35)

    def test_zero_amplitude_is_instantaneous(self) -> None:
        assert saccade_peak_velocity(0) == 0.0
        assert saccade_duration(0) == 0.0


class TestBlinkWaveform:
    def test_starts_and_ends_open(self) -> None:
        total = BLINK_CLOSING_S + 0.020 + BLINK_OPENING_S
        assert blink_waveform(np.array([0.0]))[0] == pytest.approx(0.0)
        assert blink_waveform(np.array([total]))[0] == pytest.approx(0.0, abs=1e-9)

    def test_fully_closes(self) -> None:
        closed_at = BLINK_CLOSING_S + 0.01
        assert blink_waveform(np.array([closed_at]))[0] == pytest.approx(1.0)

    def test_closing_is_faster_than_opening(self) -> None:
        """Lid closure is ballistic; reopening is slower. Asymmetry matters."""
        assert BLINK_CLOSING_S < BLINK_OPENING_S

    def test_bounded(self) -> None:
        samples = blink_waveform(np.linspace(-0.05, 0.5, 500))
        assert samples.min() >= 0.0
        assert samples.max() <= 1.0


class TestPupil:
    def test_darkness_dilates(self) -> None:
        assert steady_state_pupil_diameter(0.1) > steady_state_pupil_diameter(100.0)

    def test_diameters_are_physiological(self) -> None:
        for luminance in (0.01, 1.0, 50.0, 1000.0, 10000.0):
            diameter = steady_state_pupil_diameter(luminance)
            assert 2.0 < diameter < 8.0

    def test_photopic_value_matches_stanley_davies(self) -> None:
        """~3.8 mm at 50 cd/m^2 over a 600 deg^2 field."""
        assert steady_state_pupil_diameter(50.0) == pytest.approx(3.8, abs=0.2)

    def test_rejects_negative_luminance(self) -> None:
        with pytest.raises(ValueError, match="non-negative"):
            steady_state_pupil_diameter(-1.0)


class TestSimulation:
    def test_produces_a_curve_of_the_right_length(self) -> None:
        animation = simulate_eyes(4.0, fps=30.0, seed=1)
        assert animation.frame_count == 121
        for channel in (
            animation.gaze_yaw_deg,
            animation.gaze_pitch_deg,
            animation.eyelid_closure,
            animation.pupil_diameter_mm,
        ):
            assert channel.shape[0] == animation.frame_count

    def test_curve_actually_varies_over_time(self) -> None:
        """A static parameter set would fail this."""
        animation = simulate_eyes(20.0, seed=2)
        assert np.ptp(animation.gaze_yaw_deg) > 1.0
        assert np.ptp(animation.eyelid_closure) > 0.5
        assert np.ptp(animation.pupil_diameter_mm) > 0.0

    def test_is_deterministic_for_a_seed(self) -> None:
        first = simulate_eyes(10.0, seed=7)
        second = simulate_eyes(10.0, seed=7)
        assert np.array_equal(first.gaze_yaw_deg, second.gaze_yaw_deg)
        assert np.array_equal(first.pupil_diameter_mm, second.pupil_diameter_mm)

    def test_different_seeds_differ(self) -> None:
        first = simulate_eyes(10.0, seed=1)
        second = simulate_eyes(10.0, seed=2)
        assert not np.array_equal(first.gaze_yaw_deg, second.gaze_yaw_deg)

    def test_gaze_stays_within_the_oculomotor_range(self) -> None:
        animation = simulate_eyes(60.0, seed=3)
        assert np.abs(animation.gaze_yaw_deg).max() <= GAZE_LIMIT_YAW_DEG + 1e-6
        assert np.abs(animation.gaze_pitch_deg).max() <= GAZE_LIMIT_PITCH_DEG + 1e-6

    def test_eyelid_is_bounded(self) -> None:
        animation = simulate_eyes(30.0, seed=4)
        assert animation.eyelid_closure.min() >= 0.0
        assert animation.eyelid_closure.max() <= 1.0

    def test_blink_rate_tracks_the_request(self) -> None:
        rates = [
            simulate_eyes(120.0, seed=s, blink_rate_per_min=17.0).blink_rate_per_min()
            for s in range(12)
        ]
        assert 13.0 < float(np.mean(rates)) < 20.0

    def test_zero_blink_rate_produces_no_blinks(self) -> None:
        animation = simulate_eyes(30.0, seed=5, blink_rate_per_min=0.0)
        assert animation.blinks == []
        assert animation.eyelid_closure.max() == 0.0

    def test_saccade_events_obey_the_main_sequence(self) -> None:
        animation = simulate_eyes(60.0, seed=6)
        assert animation.saccades
        for event in animation.saccades:
            expected = saccade_peak_velocity(event.amplitude_deg)
            assert event.peak_velocity_deg_s == pytest.approx(expected, rel=1e-6)
            assert event.duration_s == pytest.approx(
                saccade_duration(event.amplitude_deg), rel=1e-6
            )

    def test_saccades_do_not_overlap(self) -> None:
        animation = simulate_eyes(60.0, seed=8)
        ends = [s.onset_s + s.duration_s for s in animation.saccades]
        onsets = [s.onset_s for s in animation.saccades]
        for end, next_onset in zip(ends, onsets[1:]):
            assert next_onset >= end

    def test_brighter_scene_constricts_the_pupil(self) -> None:
        dim = simulate_eyes(20.0, seed=9, luminance_cd_m2=1.0)
        bright = simulate_eyes(20.0, seed=9, luminance_cd_m2=5000.0)
        assert bright.pupil_diameter_mm.mean() < dim.pupil_diameter_mm.mean()

    def test_serialises_to_an_animation_clip(self) -> None:
        payload = simulate_eyes(5.0, seed=10).as_dict()
        assert payload["schema"] == "animaforge.eye-animation/1"
        channels = payload["channels"]
        assert len(channels["gaze_yaw_deg"]) == payload["frame_count"]
        assert len(channels["eyeBlinkLeft"]) == payload["frame_count"]
        assert len(channels["pupil_diameter_mm"]) == payload["frame_count"]
        assert payload["statistics"]["saccade_count"] == len(
            payload["events"]["saccades"]
        )

    def test_blendshape_channel_names_match_the_facs_rig(self) -> None:
        from src.services.avatar.facs import ARKIT_BLENDSHAPES

        channels = simulate_eyes(2.0, seed=11).as_dict()["channels"]
        assert "eyeBlinkLeft" in ARKIT_BLENDSHAPES
        assert "eyeBlinkRight" in ARKIT_BLENDSHAPES
        assert "eyeBlinkLeft" in channels

    @pytest.mark.parametrize(
        ("kwargs", "message"),
        [
            ({"duration_s": 0.0}, "duration_s"),
            ({"fps": 0.0}, "fps"),
            ({"blink_rate_per_min": -1.0}, "blink_rate_per_min"),
            ({"mean_fixation_s": 0.0}, "mean_fixation_s"),
        ],
    )
    def test_rejects_invalid_arguments(self, kwargs: dict, message: str) -> None:
        params = {"duration_s": 10.0, **kwargs}
        with pytest.raises(ValueError, match=message):
            simulate_eyes(**params)


class TestEyeEndpoint:
    def test_returns_an_animation(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/avatar/eyes/simulate", json={"duration_s": 3.0, "fps": 24.0}
        )
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["frame_count"] == 73
        assert len(payload["channels"]["pupil_diameter_mm"]) == 73

    def test_rejects_zero_duration(self, client: TestClient) -> None:
        resp = client.post("/ai/v1/avatar/eyes/simulate", json={"duration_s": 0})
        assert resp.status_code == 422
