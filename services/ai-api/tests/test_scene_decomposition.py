"""E3 -- prompt to structured scene decomposition.

Covers the ten spec fields, the provenance every field carries, and the
handoff into the existing scene_graph_engine.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.services.scene_decomposition import (
    decompose_prompt,
    decompose_sequence,
    to_scene_graph,
)
from src.services.scene_graph_engine import compute_spatial_layout, parse_scene_graph

client = TestClient(app)

RICH = (
    'Low angle close-up of Marlow, tense, in a rain-soaked alley at night. '
    'She whispers "They already know." Camera pushes in slowly.'
)
SPARSE = "a person"

SPEC_FIELDS = (
    "subject", "environment", "camera", "lens", "action",
    "emotional_beat", "timing", "dialogue_cue", "lighting_state",
    "continuity_dependency",
)


class TestTenFields:
    def test_all_spec_fields_present(self) -> None:
        d = decompose_prompt(RICH)
        for field in SPEC_FIELDS:
            assert field in d, f"E3 requires {field}"

    def test_sparse_prompt_still_yields_every_field(self) -> None:
        """A bare prompt must not produce a partial structure."""
        d = decompose_prompt(SPARSE)
        for field in SPEC_FIELDS:
            assert field in d

    def test_empty_prompt_rejected(self) -> None:
        with pytest.raises(ValueError):
            decompose_prompt("   ")


class TestExtraction:
    def test_shot_size_and_angle(self) -> None:
        c = decompose_prompt(RICH)["camera"]
        assert c["shot_size"]["value"] == "close_up"
        assert c["angle"]["value"] == "low"

    def test_longest_match_wins(self) -> None:
        """'extreme close-up' must not be read as 'close-up'."""
        d = decompose_prompt("An extreme close-up of a hand")
        assert d["camera"]["shot_size"]["value"] == "extreme_close_up"

    def test_camera_movement(self) -> None:
        assert decompose_prompt(RICH)["camera"]["movement"]["value"] == "dolly_in"

    def test_time_of_day_and_weather(self) -> None:
        env = decompose_prompt(RICH)["environment"]
        assert env["time_of_day"]["value"] == "night"
        assert "rain" in str(env["weather"]["value"])

    def test_interior_vs_exterior(self) -> None:
        assert decompose_prompt("inside a kitchen")["environment"]["setting"]["value"] == "interior"
        assert decompose_prompt("on a rooftop")["environment"]["setting"]["value"] == "exterior"

    def test_emotional_beat(self) -> None:
        beat = decompose_prompt(RICH)["emotional_beat"]
        assert beat["beat"]["value"] == "tense"
        assert beat["arousal"]["value"] > 0.5

    def test_dialogue_extracted_from_quotes(self) -> None:
        dlg = decompose_prompt(RICH)["dialogue_cue"]
        assert dlg["has_dialogue"]["value"] is True
        assert dlg["lines"]["value"] == ["They already know."]
        assert dlg["word_count"]["value"] == 3

    def test_speech_verb_without_quotes_is_still_dialogue(self) -> None:
        dlg = decompose_prompt("She says something offscreen")["dialogue_cue"]
        assert dlg["has_dialogue"]["value"] is True
        assert dlg["lines"]["value"] == []

    def test_named_subject(self) -> None:
        labels = [s["label"] for s in decompose_prompt(RICH)["subject"]["value"]]
        assert "Marlow" in labels

    def test_sentence_initial_word_is_not_a_name(self) -> None:
        """Grammar capitalises the first word; that is not a character."""
        labels = [s["label"] for s in decompose_prompt("Rain falls on a street")["subject"]["value"]]
        assert "Rain" not in labels


class TestDerivation:
    def test_lens_follows_shot_size(self) -> None:
        lens = decompose_prompt("close-up of a face")["lens"]
        assert lens["focal_length_mm"]["value"] == 85
        assert lens["focal_length_mm"]["source"] == "derived"

    def test_explicit_focal_length_wins(self) -> None:
        lens = decompose_prompt("a wide shot on a 35mm lens")["lens"]
        assert lens["focal_length_mm"]["value"] == 35
        assert lens["focal_length_mm"]["source"] == "matched"

    def test_explicit_duration_wins(self) -> None:
        t = decompose_prompt("a static wide shot lasting 8 seconds")["timing"]
        assert t["duration_s"]["value"] == 8.0
        assert t["duration_s"]["source"] == "matched"

    def test_duration_is_clamped(self) -> None:
        t = decompose_prompt("a shot lasting 600 seconds")["timing"]
        assert t["duration_s"]["value"] == 20.0

    def test_dialogue_lengthens_the_shot(self) -> None:
        short = decompose_prompt('He says "Go."')["timing"]["duration_s"]["value"]
        long = decompose_prompt(
            'He says "We have been walking for three days and there is still no sign of the river."'
        )["timing"]["duration_s"]["value"]
        assert long > short

    def test_lighting_follows_time_of_day(self) -> None:
        night = decompose_prompt("a street at night")["lighting_state"]
        noon = decompose_prompt("a street at midday")["lighting_state"]
        assert night["colour_temperature_k"]["value"] != noon["colour_temperature_k"]["value"]
        assert noon["key_elevation_deg"]["value"] > night["key_elevation_deg"]["value"]

    def test_negative_valence_raises_contrast(self) -> None:
        grim = decompose_prompt("a terrified face")["lighting_state"]["key_to_fill_ratio"]["value"]
        calm = decompose_prompt("a calm face")["lighting_state"]["key_to_fill_ratio"]["value"]
        assert grim > calm


class TestProvenance:
    def test_every_leaf_declares_a_source(self) -> None:
        d = decompose_prompt(RICH)

        def walk(node, path=""):
            if isinstance(node, dict) and "value" in node:
                assert node["source"] in {"matched", "derived", "default"}, path
                return
            if isinstance(node, dict):
                for k, v in node.items():
                    walk(v, f"{path}.{k}")

        for field in SPEC_FIELDS:
            walk(d[field], field)

    def test_unstated_fields_are_marked_default_not_matched(self) -> None:
        """The honest part: a convention must not look like direction."""
        d = decompose_prompt(SPARSE)
        assert d["camera"]["shot_size"]["source"] == "default"
        assert d["environment"]["time_of_day"]["source"] == "default"

    def test_coverage_reports_what_was_assumed(self) -> None:
        rich = decompose_prompt(RICH)["coverage"]
        sparse = decompose_prompt(SPARSE)["coverage"]
        assert rich["ratio"] > sparse["ratio"]
        assert sparse["defaulted_fields"]
        assert "camera.shot_size" in sparse["defaulted_fields"]

    def test_determinism(self) -> None:
        assert decompose_prompt(RICH) == decompose_prompt(RICH)


class TestSceneGraphHandoff:
    def test_output_parses_as_a_scene_graph(self) -> None:
        """The whole point: this must feed the engine that already exists."""
        graph = to_scene_graph(decompose_prompt(RICH))
        parsed = parse_scene_graph(graph)
        assert parsed["elements"]

    def test_layout_runs_on_the_produced_graph(self) -> None:
        graph = to_scene_graph(decompose_prompt(RICH))
        layout = compute_spatial_layout(graph)
        assert len(layout["elements"]) == len(graph["elements"])

    def test_graph_carries_camera_and_light(self) -> None:
        graph = to_scene_graph(decompose_prompt(RICH))
        types = {e["type"] for e in graph["elements"]}
        assert {"camera", "light", "character"} <= types

    def test_longer_lens_moves_the_camera_back(self) -> None:
        near = to_scene_graph(decompose_prompt("a wide shot of a field"))
        far = to_scene_graph(decompose_prompt("an extreme close-up of an eye"))
        z_near = next(e for e in near["elements"] if e["type"] == "camera")["position"]["z"]
        z_far = next(e for e in far["elements"] if e["type"] == "camera")["position"]["z"]
        assert abs(z_far) > abs(z_near)


class TestSequence:
    def test_continuity_chains(self) -> None:
        seq = decompose_sequence(["a wide shot of a street", "a close-up of the same door"])
        assert seq["shot_count"] == 2
        second = seq["shots"][1]["continuity_dependency"]
        assert second["depends_on_previous"]["value"] is True
        assert second["previous_shot_id"]["value"] == seq["shots"][0]["shot_id"]

    def test_first_shot_depends_on_nothing(self) -> None:
        seq = decompose_sequence(["a wide shot of a street"])
        assert seq["shots"][0]["continuity_dependency"]["previous_shot_id"]["value"] is None

    def test_total_duration_sums(self) -> None:
        seq = decompose_sequence(["a wide shot", "a close-up", "a medium shot"])
        assert seq["total_duration_s"] == pytest.approx(
            sum(s["timing"]["duration_s"]["value"] for s in seq["shots"]), abs=0.01
        )

    def test_empty_sequence_rejected(self) -> None:
        with pytest.raises(ValueError):
            decompose_sequence([])


class TestEndpoints:
    def test_decompose_reachable(self) -> None:
        resp = client.post("/ai/v1/scene-graph/decompose", json={"prompt": RICH})
        assert resp.status_code == 200
        body = resp.json()
        assert body["engine"]["is_mock"] is False
        assert body["engine"]["cluster"] == "E3"

    def test_decompose_returns_a_usable_graph(self) -> None:
        body = client.post("/ai/v1/scene-graph/decompose", json={"prompt": RICH}).json()
        layout = client.post(
            "/ai/v1/scene-graph/layout", json={"scene_graph": body["scene_graph"]}
        )
        assert layout.status_code == 200

    def test_empty_prompt_is_422(self) -> None:
        assert client.post("/ai/v1/scene-graph/decompose", json={"prompt": ""}).status_code == 422

    def test_sequence_endpoint(self) -> None:
        resp = client.post(
            "/ai/v1/scene-graph/decompose-sequence",
            json={"prompts": ["a wide shot of a street", "a close-up of the same door"]},
        )
        assert resp.status_code == 200
        assert resp.json()["shot_count"] == 2
