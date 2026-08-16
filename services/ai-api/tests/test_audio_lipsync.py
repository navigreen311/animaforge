"""Tests for D4 lip-sync: grapheme-to-phoneme, duration model and visemes.

These assert linguistic properties, not just plumbing. A G2P that returns the
right *number* of symbols but the wrong ones drives a mouth rig incorrectly,
and the previous implementation passed every shape-only assertion while
emitting one "phoneme" per letter.
"""

from __future__ import annotations

import sys
from itertools import pairwise
from pathlib import Path

_AI_API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_AI_API_ROOT))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.audio import router
from src.services import engines
from src.services.audio import g2p, timing
from src.services.audio_service import generate_lip_sync_data


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


class TestGraphemeToPhoneme:
    def test_the_is_two_phonemes_not_three_letters(self) -> None:
        """The case the old implementation got most visibly wrong."""
        assert g2p.phonemise_word("the") == ("DH", "AH")

    @pytest.mark.parametrize(
        ("word", "expected"),
        [
            ("cat", ("K", "AE", "T")),
            ("quick", ("K", "W", "IH", "K")),
            ("brown", ("B", "R", "AW", "N")),
            ("ship", ("SH", "IH", "P")),
            ("church", ("CH", "ER", "CH")),
            ("phone", ("F", "OW", "N")),
            ("know", ("N", "OW")),
            ("through", ("TH", "R", "UW")),
        ],
    )
    def test_known_pronunciations(self, word: str, expected: tuple[str, ...]) -> None:
        assert g2p.phonemise_word(word) == expected

    def test_silent_final_e_is_dropped(self) -> None:
        assert "EH" not in g2p.phonemise_word("make")
        assert g2p.phonemise_word("make") == ("M", "EY", "K")

    def test_magic_e_lengthens_the_vowel(self) -> None:
        assert "AE" in g2p.phonemise_word("mat")
        assert "EY" in g2p.phonemise_word("mate")

    def test_soft_and_hard_c(self) -> None:
        assert g2p.phonemise_word("city")[0] == "S"
        assert g2p.phonemise_word("cat")[0] == "K"

    def test_every_symbol_is_in_the_inventory(self) -> None:
        text = "The quick brown fox jumps over the lazy dog, watching eight ships."
        for _word, phonemes in g2p.phonemise(text):
            for phoneme in phonemes:
                assert phoneme in g2p.ALL_PHONEMES, phoneme

    def test_punctuation_becomes_silence(self) -> None:
        tokens = g2p.phonemise("Hello, world.")
        assert (",", (g2p.SILENCE,)) in tokens
        assert (".", (g2p.SILENCE,)) in tokens

    def test_never_emits_bare_letters(self) -> None:
        """Letters that are not ARPABET symbols must never appear."""
        for _word, phonemes in g2p.phonemise("The quick brown fox"):
            for phoneme in phonemes:
                assert phoneme not in {"E", "H", "Q", "C", "X"}

    def test_empty_word_rejected(self) -> None:
        with pytest.raises(ValueError, match="at least one letter"):
            g2p.phonemise_word("   ")


class TestDurationModel:
    def test_durations_are_not_uniform(self) -> None:
        """The whole point: a constant duration is what this replaced."""
        events = timing.schedule(g2p.phonemise("The quick brown fox jumps"))
        lengths = {e["end_ms"] - e["start_ms"] for e in events}
        assert len(lengths) > 3

    def test_vowels_outlast_stops(self) -> None:
        assert timing.intrinsic_duration_ms("IY") > timing.intrinsic_duration_ms("T")
        assert timing.intrinsic_duration_ms("AA") > timing.intrinsic_duration_ms("P")

    def test_diphthongs_outlast_lax_vowels(self) -> None:
        assert timing.intrinsic_duration_ms("AY") > timing.intrinsic_duration_ms("IH")

    def test_phrase_final_lengthening(self) -> None:
        """The last phoneme before a pause is longer than the same one mid-phrase."""
        mid = timing.schedule(g2p.phonemise("cat cat cat"))
        final = timing.schedule(g2p.phonemise("cat, cat"))

        first_t = next(e for e in mid if e["phoneme"] == "T")
        pre_pause_t = next(e for e in final if e["phoneme"] == "T")

        assert (pre_pause_t["end_ms"] - pre_pause_t["start_ms"]) > (
            first_t["end_ms"] - first_t["start_ms"]
        )

    def test_timeline_is_contiguous_and_monotonic(self) -> None:
        events = timing.schedule(g2p.phonemise("Hello there, friend."))
        assert events[0]["start_ms"] == 0
        for previous, current in pairwise(events):
            assert current["start_ms"] == previous["end_ms"]
            assert current["end_ms"] > current["start_ms"]

    def test_speaking_rate_shortens(self) -> None:
        slow = timing.schedule(g2p.phonemise("the quick brown fox"), speaking_rate=0.8)
        fast = timing.schedule(g2p.phonemise("the quick brown fox"), speaking_rate=1.5)
        assert fast[-1]["end_ms"] < slow[-1]["end_ms"]

    def test_rate_must_be_positive(self) -> None:
        with pytest.raises(ValueError, match="speaking_rate"):
            timing.schedule(g2p.phonemise("hello"), speaking_rate=0)

    def test_speech_rate_is_plausible(self) -> None:
        """~9 words should land in a believable few seconds, not 0.7s or 30s."""
        text = "The quick brown fox jumps over the lazy dog"
        events = timing.schedule(g2p.phonemise(text))
        seconds = events[-1]["end_ms"] / 1000
        assert 2.0 < seconds < 6.0


class TestVisemes:
    def test_bilabials_share_one_viseme(self) -> None:
        """P, B and M are visually identical; the rig must not distinguish them."""
        assert (
            timing.viseme_for("P") == timing.viseme_for("B") == timing.viseme_for("M")
        )

    def test_distinct_mouth_shapes_stay_distinct(self) -> None:
        assert timing.viseme_for("P") != timing.viseme_for("F")
        assert timing.viseme_for("IY") != timing.viseme_for("UW")

    def test_every_phoneme_maps_into_the_declared_set(self) -> None:
        for phoneme in g2p.ALL_PHONEMES:
            assert timing.viseme_for(phoneme) in timing.VISEMES

    def test_silence_maps_to_closed(self) -> None:
        assert timing.viseme_for(g2p.SILENCE) == "sil"

    def test_unknown_symbol_does_not_guess(self) -> None:
        assert timing.viseme_for("NOT_A_PHONEME") == "sil"


class TestLipSyncService:
    def test_reports_itself_as_real(self) -> None:
        result = generate_lip_sync_data("Hello world")
        assert result["engine"]["is_mock"] is False
        assert result["source"] == "duration-model"

    def test_carries_word_and_viseme(self) -> None:
        events = generate_lip_sync_data("Hello world")["phonemes"]
        assert {e["word"] for e in events} == {"Hello", "world"}
        assert all(e["viseme"] in timing.VISEMES for e in events)

    def test_alignment_skipped_is_declared(self) -> None:
        """Asking for alignment without the engine must say so, not stay silent."""
        if engines.upgrade_available("audio"):
            pytest.skip("forced-alignment upgrade is provisioned on this host")

        result = generate_lip_sync_data("Hello world", audio_path="/tmp/nope.wav")
        assert result["source"] == "duration-model"
        assert "alignment_skipped" in result["engine"]

    def test_deterministic(self) -> None:
        first = generate_lip_sync_data("The quick brown fox")
        second = generate_lip_sync_data("The quick brown fox")
        assert first["phonemes"] == second["phonemes"]


class TestLipSyncEndpoint:
    def test_returns_a_timeline(self, client: TestClient) -> None:
        resp = client.post("/ai/v1/audio/lip-sync", json={"dialogue": "Hello there"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["duration_ms"] > 0
        assert body["engine"]["is_mock"] is False
        assert body["phonemes"][0]["viseme"] in timing.VISEMES

    def test_rate_affects_duration(self, client: TestClient) -> None:
        slow = client.post(
            "/ai/v1/audio/lip-sync",
            json={"dialogue": "The quick brown fox", "speaking_rate": 0.8},
        ).json()
        fast = client.post(
            "/ai/v1/audio/lip-sync",
            json={"dialogue": "The quick brown fox", "speaking_rate": 1.6},
        ).json()
        assert fast["duration_ms"] < slow["duration_ms"]

    def test_empty_dialogue_rejected(self, client: TestClient) -> None:
        resp = client.post("/ai/v1/audio/lip-sync", json={"dialogue": ""})
        assert resp.status_code == 422

    def test_zero_rate_rejected(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/audio/lip-sync", json={"dialogue": "hi", "speaking_rate": 0}
        )
        assert resp.status_code == 422


class TestSynthesisStaysHonest:
    def test_generate_audio_declares_itself_mock(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/generate/audio",
            json={"shot_id": "shot-1", "dialogue": "Hello", "voice_id": "v1"},
        )
        assert resp.status_code == 200
        engine = resp.json()["engine"]
        assert engine["is_mock"] is True
        assert "not implemented" in engine["reason"].lower()

    def test_no_audio_url_is_emitted(self, client: TestClient) -> None:
        """Nothing was synthesised, so nothing may be linked."""
        body = client.post(
            "/ai/v1/generate/audio",
            json={"shot_id": "shot-1", "dialogue": "Hello", "voice_id": "v1"},
        ).json()
        assert not any(
            isinstance(v, str) and ("http" in v or ".wav" in v or ".mp3" in v)
            for v in body.values()
        )
