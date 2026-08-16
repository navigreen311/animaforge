"""Tests for X6 style fingerprinting.

The property under test is that the numbers come from the *image*. The
implementation this replaced derived its palette from a hash of the URL, so it
was deterministic and self-consistent while being entirely unrelated to any
pixel. Tests that only checked shape passed against it happily.

Every fixture here is a PNG written byte by byte with known contents, so an
assertion about the palette is an assertion about pixels that were really
decoded.
"""

from __future__ import annotations

import struct
import sys
import zlib
from pathlib import Path

_AI_API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_AI_API_ROOT))

import numpy as np
import pytest

from src.services import engines
from src.services.style.clip_embedding import clip_available, embed_image
from src.services.style.fingerprint import (
    compare,
    fingerprint_reference,
    style_fingerprint,
)
from src.services.style_intelligence import extract_video_fingerprint


def _write_png(path: Path, array: np.ndarray) -> Path:
    """Write an 8-bit RGB non-interlaced PNG, the one format the reader takes."""
    height, width, _ = array.shape
    raw = b"".join(b"\x00" + array[y].tobytes() for y in range(height))

    def chunk(tag: bytes, data: bytes) -> bytes:
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )
    return path


@pytest.fixture()
def flat_red() -> np.ndarray:
    image = np.zeros((64, 64, 3), dtype=np.uint8)
    image[:, :] = (200, 40, 40)
    return image


@pytest.fixture()
def striped_blue() -> np.ndarray:
    image = np.zeros((64, 64, 3), dtype=np.uint8)
    image[:, :] = (30, 40, 200)
    image[::4, :] = (250, 250, 250)
    return image


class TestMeasuresRealPixels:
    def test_palette_is_the_colour_in_the_image(self, flat_red: np.ndarray) -> None:
        fingerprint = style_fingerprint(flat_red)
        # (200, 40, 40) is #C82828. Not approximately — exactly.
        assert fingerprint["color_palette"][0] == "#C82828"

    def test_palette_finds_both_colours(self, striped_blue: np.ndarray) -> None:
        palette = style_fingerprint(striped_blue)["color_palette"]
        assert "#1E28C8" in palette
        assert "#FAFAFA" in palette

    def test_flat_image_has_no_edges(self, flat_red: np.ndarray) -> None:
        fingerprint = style_fingerprint(flat_red)
        assert fingerprint["edge_density"] == 0.0
        assert fingerprint["contrast"] == 0.0

    def test_striped_image_has_edges(self, striped_blue: np.ndarray) -> None:
        assert style_fingerprint(striped_blue)["edge_density"] > 0.2

    def test_warm_and_cool_are_opposite(
        self, flat_red: np.ndarray, striped_blue: np.ndarray
    ) -> None:
        assert style_fingerprint(flat_red)["color_temperature"] > 0
        assert style_fingerprint(striped_blue)["color_temperature"] < 0

    def test_changing_pixels_changes_the_fingerprint(
        self, flat_red: np.ndarray
    ) -> None:
        """The property the URL-hash implementation could not have."""
        recoloured = flat_red.copy()
        recoloured[:, :] = (40, 200, 40)
        assert (
            style_fingerprint(flat_red)["color_palette"]
            != style_fingerprint(recoloured)["color_palette"]
        )

    def test_brightness_tracks_luma(self) -> None:
        dark = np.full((32, 32, 3), 20, dtype=np.uint8)
        light = np.full((32, 32, 3), 220, dtype=np.uint8)
        assert (
            style_fingerprint(light)["brightness"]
            > style_fingerprint(dark)["brightness"]
        )

    def test_rejects_tiny_images(self) -> None:
        with pytest.raises(ValueError, match="at least 4x4"):
            style_fingerprint(np.zeros((2, 2, 3), dtype=np.uint8))

    def test_rejects_wrong_shape(self) -> None:
        with pytest.raises(ValueError, match="expected"):
            style_fingerprint(np.zeros((8, 8, 1), dtype=np.uint8))


class TestComparison:
    def test_identical_images_score_one(self, flat_red: np.ndarray) -> None:
        fingerprint = style_fingerprint(flat_red)
        assert compare(fingerprint, fingerprint)["overall"] == 1.0

    def test_different_images_score_lower(
        self, flat_red: np.ndarray, striped_blue: np.ndarray
    ) -> None:
        first = style_fingerprint(flat_red)
        second = style_fingerprint(striped_blue)
        assert compare(first, second)["overall"] < compare(first, first)["overall"]

    def test_per_dimension_is_reported(
        self, flat_red: np.ndarray, striped_blue: np.ndarray
    ) -> None:
        result = compare(style_fingerprint(flat_red), style_fingerprint(striped_blue))
        assert set(result["per_dimension"]) >= {
            "saturation",
            "contrast",
            "edge_density",
            "color_palette",
        }


class TestDecodePath:
    def test_png_is_measured(self, tmp_path: Path, flat_red: np.ndarray) -> None:
        path = _write_png(tmp_path / "frame.png", flat_red)
        probe = fingerprint_reference(str(path))
        assert probe["measured"] is True
        assert probe["fingerprint"]["color_palette"][0] == "#C82828"

    def test_undecodable_is_reported_not_invented(self, tmp_path: Path) -> None:
        path = tmp_path / "frame.jpg"
        path.write_bytes(b"\xff\xd8\xff\xe0 not really a jpeg")
        probe = fingerprint_reference(str(path))
        assert probe["measured"] is False
        assert probe["fingerprint"] is None
        assert probe["reason"]

    def test_missing_file_is_reported(self, tmp_path: Path) -> None:
        probe = fingerprint_reference(str(tmp_path / "absent.png"))
        assert probe["measured"] is False


class TestServiceLevel:
    def test_undecodable_source_is_labelled_unmeasured(self) -> None:
        fingerprint = extract_video_fingerprint("https://example.com/film.mp4")
        assert fingerprint.measured is False
        assert fingerprint.color_palette == []
        assert fingerprint.confidence == 0.0
        assert fingerprint.engine["is_mock"] is True

    def test_decodable_source_is_measured(
        self, tmp_path: Path, striped_blue: np.ndarray
    ) -> None:
        path = _write_png(tmp_path / "frame.png", striped_blue)
        fingerprint = extract_video_fingerprint(str(path))

        assert fingerprint.measured is True
        assert fingerprint.engine["is_mock"] is False
        assert "#1E28C8" in fingerprint.color_palette

    def test_unmeasurable_attributes_say_so(
        self, tmp_path: Path, flat_red: np.ndarray
    ) -> None:
        """A still frame cannot reveal lens or camera motion; do not guess."""
        path = _write_png(tmp_path / "frame.png", flat_red)
        fingerprint = extract_video_fingerprint(str(path))
        assert fingerprint.lens_character == "unmeasured"
        assert fingerprint.camera_motion == "unmeasured"
        assert fingerprint.depth_of_field == "unmeasured"

    def test_two_different_frames_differ(self, tmp_path: Path) -> None:
        red = np.full((32, 32, 3), 0, dtype=np.uint8)
        red[:, :] = (200, 40, 40)
        green = np.full((32, 32, 3), 0, dtype=np.uint8)
        green[:, :] = (40, 200, 40)

        first = extract_video_fingerprint(str(_write_png(tmp_path / "a.png", red)))
        second = extract_video_fingerprint(str(_write_png(tmp_path / "b.png", green)))
        assert first.color_palette != second.color_palette


class TestClipGate:
    def test_clip_skips_explicitly_when_unprovisioned(self, tmp_path: Path) -> None:
        if clip_available():
            pytest.skip("CLIP style engine is provisioned on this host")

        with pytest.raises(engines.EngineUnavailable, match="Missing"):
            embed_image(str(tmp_path / "anything.png"))

    def test_clip_embedding(self, tmp_path: Path, flat_red: np.ndarray) -> None:
        if not clip_available():
            status = engines.probe("style")
            pytest.skip(
                "CLIP style upgrade unavailable; missing: "
                + ", ".join(status.missing)
            )

        path = _write_png(tmp_path / "frame.png", flat_red)
        result = embed_image(str(path))
        assert result["dims"] > 0
        assert len(result["embedding"]) == result["dims"]
