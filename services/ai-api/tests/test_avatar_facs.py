"""Tests for X5 subsystem 3 — FACS action units driving blendshape weights."""

from __future__ import annotations

import sys
from pathlib import Path

_AI_API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_AI_API_ROOT))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.avatar import router
from src.services.avatar.facs import (
    ACTION_UNITS,
    ARKIT_BLENDSHAPES,
    EMOTION_PROTOTYPES,
    INTENSITY_SCALE,
    blendshapes_for_emotion,
    build_facs_rig,
    normalise_intensity,
    solve_blendshapes,
)


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


class TestCatalogue:
    def test_has_the_core_action_units(self) -> None:
        for au in (1, 2, 4, 5, 6, 7, 9, 12, 15, 17, 20, 25, 26, 45):
            assert au in ACTION_UNITS

    def test_arkit_target_count(self) -> None:
        assert len(ARKIT_BLENDSHAPES) == 52
        assert len(set(ARKIT_BLENDSHAPES)) == 52

    def test_every_au_targets_known_blendshapes(self) -> None:
        known = set(ARKIT_BLENDSHAPES)
        for unit in ACTION_UNITS.values():
            unknown = set(unit.targets) - known
            assert not unknown, f"AU{unit.number} targets unknown shapes: {unknown}"

    def test_every_au_has_a_muscle(self) -> None:
        for unit in ACTION_UNITS.values():
            assert unit.muscle.strip()


class TestIntensity:
    def test_facs_letters(self) -> None:
        assert normalise_intensity("A") == 0.2
        assert normalise_intensity("E") == 1.0
        assert normalise_intensity("c") == 0.6

    def test_letters_are_ordered(self) -> None:
        values = [INTENSITY_SCALE[k] for k in "ABCDE"]
        assert values == sorted(values)

    def test_numeric_passthrough(self) -> None:
        assert normalise_intensity(0.35) == pytest.approx(0.35)

    def test_rejects_bad_letter(self) -> None:
        with pytest.raises(ValueError, match="FACS intensity"):
            normalise_intensity("Z")

    def test_rejects_out_of_range_number(self) -> None:
        with pytest.raises(ValueError, match="AU intensity"):
            normalise_intensity(1.4)


class TestSolver:
    def test_smile_drives_both_mouth_corners(self) -> None:
        weights = solve_blendshapes({12: 1.0})
        assert weights["mouthSmileLeft"] == pytest.approx(1.0)
        assert weights["mouthSmileRight"] == pytest.approx(1.0)

    def test_intensity_scales_output(self) -> None:
        half = solve_blendshapes({12: 0.5})
        assert half["mouthSmileLeft"] == pytest.approx(0.5)

    def test_weights_are_clamped_to_unit_range(self) -> None:
        # AU6 and AU7 both drive eyeSquint; the sum must not exceed 1.
        weights = solve_blendshapes({6: 1.0, 7: 1.0}, include_zeros=True)
        assert all(0.0 <= v <= 1.0 for v in weights.values())

    def test_antagonists_cancel(self) -> None:
        """AU5 widens the eye, AU6 narrows it; equal drive nets to nothing."""
        weights = solve_blendshapes({5: 0.6, 7: 0.6}, include_zeros=True)
        assert weights["eyeWideLeft"] == pytest.approx(0.0)
        assert weights["eyeSquintLeft"] == pytest.approx(0.0)

    def test_stronger_antagonist_wins(self) -> None:
        weights = solve_blendshapes({5: 0.9, 7: 0.3}, include_zeros=True)
        assert weights["eyeWideLeft"] == pytest.approx(0.6)
        assert weights["eyeSquintLeft"] == pytest.approx(0.0)

    def test_smile_and_frown_cancel(self) -> None:
        weights = solve_blendshapes({12: 0.5, 15: 0.5}, include_zeros=True)
        assert weights["mouthSmileLeft"] == pytest.approx(0.0)
        assert weights["mouthFrownLeft"] == pytest.approx(0.0)

    def test_mouth_aperture_is_exclusive(self) -> None:
        """A jaw cannot be parted and stretched at once; the widest wins."""
        weights = solve_blendshapes({25: 1.0, 27: 1.0})
        assert weights["jawOpen"] == pytest.approx(1.0)

    def test_lips_part_alone_is_a_small_aperture(self) -> None:
        weights = solve_blendshapes({25: 1.0})
        assert weights["jawOpen"] == pytest.approx(0.25)

    def test_zero_intensity_produces_nothing(self) -> None:
        assert solve_blendshapes({12: 0.0}) == {}

    def test_include_zeros_emits_every_target(self) -> None:
        weights = solve_blendshapes({12: 1.0}, include_zeros=True)
        assert set(weights) == set(ARKIT_BLENDSHAPES)

    def test_sparse_by_default(self) -> None:
        weights = solve_blendshapes({12: 1.0})
        assert set(weights) == {"mouthSmileLeft", "mouthSmileRight"}

    def test_rejects_unknown_au(self) -> None:
        with pytest.raises(ValueError, match="Unsupported action units"):
            solve_blendshapes({999: 1.0})


class TestEmotions:
    def test_happiness_is_au6_plus_au12(self) -> None:
        assert EMOTION_PROTOTYPES["happiness"] == {6: 0.8, 12: 1.0}

    def test_happiness_smiles(self) -> None:
        weights = blendshapes_for_emotion("happiness")
        assert weights["mouthSmileLeft"] > 0.5
        assert weights["cheekSquintLeft"] > 0.0

    def test_sadness_frowns(self) -> None:
        weights = blendshapes_for_emotion("sadness")
        assert weights["mouthFrownLeft"] > 0.0
        assert weights["browInnerUp"] > 0.0

    def test_surprise_opens_the_jaw(self) -> None:
        assert blendshapes_for_emotion("surprise")["jawOpen"] > 0.0

    def test_anger_lowers_the_brow(self) -> None:
        assert blendshapes_for_emotion("anger")["browDownLeft"] > 0.0

    def test_disgust_wrinkles_the_nose(self) -> None:
        assert blendshapes_for_emotion("disgust")["noseSneerLeft"] > 0.0

    def test_neutral_is_empty(self) -> None:
        assert blendshapes_for_emotion("neutral") == {}

    def test_intensity_scales_the_prototype(self) -> None:
        full = blendshapes_for_emotion("happiness", 1.0)
        half = blendshapes_for_emotion("happiness", 0.5)
        assert half["mouthSmileLeft"] < full["mouthSmileLeft"]

    def test_rejects_unknown_emotion(self) -> None:
        with pytest.raises(ValueError, match="Unknown emotion"):
            blendshapes_for_emotion("smug")


class TestRig:
    def test_rig_is_complete(self) -> None:
        rig = build_facs_rig("char-1", "mock")
        assert rig["character_id"] == "char-1"
        assert rig["engine"] == "mock"
        assert len(rig["blendshape_targets"]) == 52
        assert len(rig["action_units"]) == len(ACTION_UNITS)
        assert set(rig["expressions"]) == set(EMOTION_PROTOTYPES)

    def test_rig_expressions_carry_solved_weights(self) -> None:
        rig = build_facs_rig("char-1", "mock")
        happiness = rig["expressions"]["happiness"]
        assert happiness["action_units"] == {6: 0.8, 12: 1.0}
        assert happiness["blendshapes"]["mouthSmileLeft"] > 0.0


class TestFacsEndpoints:
    def test_lists_action_units(self, client: TestClient) -> None:
        data = client.get("/ai/v1/avatar/facs/action-units").json()
        assert len(data["blendshape_targets"]) == 52
        assert "happiness" in data["emotions"]

    def test_solves_action_units(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/avatar/facs/solve", json={"action_units": {"12": 1.0}}
        )
        assert resp.status_code == 200
        assert resp.json()["blendshapes"]["mouthSmileLeft"] == pytest.approx(1.0)

    def test_solves_emotion(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/avatar/facs/solve", json={"emotion": "anger"}
        )
        assert resp.status_code == 200
        assert resp.json()["active_count"] > 0

    def test_requires_exactly_one_input(self, client: TestClient) -> None:
        both = client.post(
            "/ai/v1/avatar/facs/solve",
            json={"emotion": "anger", "action_units": {"12": 1.0}},
        )
        assert both.status_code == 422

        neither = client.post("/ai/v1/avatar/facs/solve", json={})
        assert neither.status_code == 422

    def test_unknown_au_is_422(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/avatar/facs/solve", json={"action_units": {"999": 1.0}}
        )
        assert resp.status_code == 422
