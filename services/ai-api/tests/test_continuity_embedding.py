"""E6 -- perceptual descriptors computed from pixels.

The cases that matter are the ones a hash of the identifier cannot pass:
identical images must score 1.0, and images that differ in colour, layout or
focus must score lower in a direction that corresponds to how they differ.
"""

from __future__ import annotations

import struct
import zlib

import numpy as np
import pytest

from src.services import continuity_embedding as ce
from src.services.continuity_service import (
    check_character_consistency,
    check_style_consistency,
)


def gradient_image(h: int = 64, w: int = 64) -> np.ndarray:
    x = np.linspace(0, 255, w)
    y = np.linspace(0, 255, h)
    grid = np.add.outer(y, x) / 2
    return np.stack([grid, grid * 0.5, grid * 0.25], axis=2).astype(np.uint8)


def write_png(path, image: np.ndarray) -> None:
    """Write an 8-bit RGB PNG with filter type 0 on every scanline."""
    h, w, _ = image.shape
    raw = b"".join(b"\x00" + image[row].astype(np.uint8).tobytes() for row in range(h))

    def chunk(tag: bytes, body: bytes) -> bytes:
        return (
            struct.pack(">I", len(body))
            + tag
            + body
            + struct.pack(">I", zlib.crc32(tag + body) & 0xFFFFFFFF)
        )

    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


class TestDescriptor:
    def test_dimensionality(self) -> None:
        assert ce.perceptual_descriptor(gradient_image()).shape == (ce.DESCRIPTOR_DIMS,)
        assert ce.DESCRIPTOR_DIMS == 104

    def test_l2_normalised(self) -> None:
        d = ce.perceptual_descriptor(gradient_image())
        assert np.linalg.norm(d) == pytest.approx(1.0)

    def test_identical_images_score_one(self) -> None:
        image = gradient_image()
        a = ce.perceptual_descriptor(image)
        b = ce.perceptual_descriptor(image.copy())
        assert ce.cosine_similarity(a, b) == pytest.approx(1.0)

    def test_colour_shift_lowers_similarity(self) -> None:
        """A grade change between matching shots is what E6 exists to catch."""
        image = gradient_image()
        shifted = np.clip(image.astype(np.int32) + 60, 0, 255).astype(np.uint8)
        assert ce.cosine_similarity(
            ce.perceptual_descriptor(image), ce.perceptual_descriptor(shifted)
        ) < 0.99

    def test_layout_change_lowers_similarity(self) -> None:
        """Same colours, different arrangement -- the histogram alone would miss it."""
        image = gradient_image()
        flipped = image[:, ::-1, :]
        assert ce.cosine_similarity(
            ce.perceptual_descriptor(image), ce.perceptual_descriptor(flipped)
        ) < 0.999

    def test_blur_changes_the_texture_component(self) -> None:
        sharp = np.zeros((64, 64, 3), dtype=np.uint8)
        sharp[::4, :, :] = 255
        blurred = np.repeat(np.repeat(sharp[::4, ::4], 4, axis=0), 4, axis=1)
        assert ce.cosine_similarity(
            ce.perceptual_descriptor(sharp), ce.perceptual_descriptor(blurred)
        ) < 0.999

    def test_unrelated_images_score_lower_than_related_ones(self) -> None:
        base = gradient_image()
        nudged = np.clip(base.astype(np.int32) + 8, 0, 255).astype(np.uint8)
        noise = (np.random.RandomState(0).rand(64, 64, 3) * 255).astype(np.uint8)

        related = ce.cosine_similarity(
            ce.perceptual_descriptor(base), ce.perceptual_descriptor(nudged)
        )
        unrelated = ce.cosine_similarity(
            ce.perceptual_descriptor(base), ce.perceptual_descriptor(noise)
        )
        assert related > unrelated

    def test_greyscale_accepted(self) -> None:
        assert ce.perceptual_descriptor(np.full((32, 32), 128, dtype=np.uint8)).shape == (
            ce.DESCRIPTOR_DIMS,
        )

    def test_float_and_uint8_agree(self) -> None:
        image = gradient_image()
        assert ce.cosine_similarity(
            ce.perceptual_descriptor(image),
            ce.perceptual_descriptor(image.astype(np.float64) / 255.0),
        ) == pytest.approx(1.0, abs=1e-9)

    def test_too_small_rejected(self) -> None:
        with pytest.raises(ValueError):
            ce.perceptual_descriptor(np.zeros((2, 2, 3), dtype=np.uint8))

    def test_bad_shape_rejected(self) -> None:
        with pytest.raises(ValueError):
            ce.perceptual_descriptor(np.zeros(10))


class TestCosineSimilarity:
    def test_zero_vector_is_zero_not_nan(self) -> None:
        assert ce.cosine_similarity(np.zeros(4), np.ones(4)) == 0.0

    def test_clamped_to_unit_range(self) -> None:
        v = np.ones(8)
        assert ce.cosine_similarity(v, v) <= 1.0


class TestPngDecoding:
    def test_round_trip(self, tmp_path) -> None:
        image = gradient_image()
        path = tmp_path / "frame.png"
        write_png(path, image)
        decoded = ce.read_png(str(path))
        assert decoded is not None
        assert np.array_equal(decoded, image)

    def test_decoded_image_descriptor_matches_the_array(self, tmp_path) -> None:
        image = gradient_image()
        path = tmp_path / "frame.png"
        write_png(path, image)
        assert ce.cosine_similarity(
            ce.perceptual_descriptor(ce.read_png(str(path))),
            ce.perceptual_descriptor(image),
        ) == pytest.approx(1.0)

    def test_paeth_filtered_png_decodes(self, tmp_path) -> None:
        """zlib picks filters per scanline; Paeth is the usual choice."""
        image = gradient_image()
        h, w, _ = image.shape
        raw = b"".join(b"\x04" + _paeth_filter_row(image, row) for row in range(h))

        def chunk(tag: bytes, body: bytes) -> bytes:
            return (
                struct.pack(">I", len(body)) + tag + body
                + struct.pack(">I", zlib.crc32(tag + body) & 0xFFFFFFFF)
            )

        path = tmp_path / "paeth.png"
        path.write_bytes(
            b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw))
            + chunk(b"IEND", b"")
        )
        assert np.array_equal(ce.read_png(str(path)), image)

    def test_non_png_returns_none(self, tmp_path) -> None:
        path = tmp_path / "x.png"
        path.write_bytes(b"not a png")
        assert ce.read_png(str(path)) is None

    def test_missing_file_returns_none(self, tmp_path) -> None:
        assert ce.read_png(str(tmp_path / "absent.png")) is None


class TestDescribeReference:
    def test_real_image_is_measured(self, tmp_path) -> None:
        path = tmp_path / "a.png"
        write_png(path, gradient_image())
        result = ce.describe_reference(str(path))
        assert result["measured"] is True
        assert result["descriptor"] is not None

    def test_remote_url_is_not_measured(self) -> None:
        result = ce.describe_reference("https://cdn.example.com/a.png")
        assert result["measured"] is False
        assert result["descriptor"] is None
        assert result["reason"]

    def test_jpeg_says_why_it_cannot_be_decoded(self, tmp_path) -> None:
        path = tmp_path / "a.jpg"
        path.write_bytes(b"\xff\xd8\xff\xe0" + b"\x00" * 64)
        result = ce.describe_reference(str(path))
        assert result["measured"] is False
        assert "decoder" in result["reason"]


class TestContinuityIntegration:
    def test_real_frames_are_compared_as_images(self, tmp_path) -> None:
        same = gradient_image()
        a, b = tmp_path / "a.png", tmp_path / "b.png"
        write_png(a, same)
        write_png(b, same)

        result = check_character_consistency([
            {"shot_id": "s1", "character_ref": str(a)},
            {"shot_id": "s2", "character_ref": str(b)},
        ])
        assert result["measured"] is True
        assert result["score"] == pytest.approx(1.0)
        assert result["issues"] == []

    def test_different_frames_are_flagged(self, tmp_path) -> None:
        a, b = tmp_path / "a.png", tmp_path / "b.png"
        write_png(a, gradient_image())
        write_png(b, (np.random.RandomState(1).rand(64, 64, 3) * 255).astype(np.uint8))

        result = check_character_consistency([
            {"shot_id": "s1", "character_ref": str(a)},
            {"shot_id": "s2", "character_ref": str(b)},
        ])
        assert result["measured"] is True
        assert result["score"] < 1.0

    def test_unresolvable_refs_are_labelled_unmeasured(self) -> None:
        """The fallback still returns a number, but never claims it saw pixels."""
        result = check_character_consistency([
            {"shot_id": "s1", "character_ref": "https://cdn.example.com/a.png"},
            {"shot_id": "s2", "character_ref": "https://cdn.example.com/b.png"},
        ])
        assert result["measured"] is False
        assert "does not compare images" in result["measurement_note"]

    def test_style_consistency_uses_the_same_path(self, tmp_path) -> None:
        image = gradient_image()
        a, b = tmp_path / "a.png", tmp_path / "b.png"
        write_png(a, image)
        write_png(b, image)
        result = check_style_consistency([
            {"shot_id": "s1", "style_ref": str(a)},
            {"shot_id": "s2", "style_ref": str(b)},
        ])
        assert result["measured"] is True
        assert result["score"] == pytest.approx(1.0)


def _paeth_filter_row(image: np.ndarray, row: int) -> bytes:
    """Apply PNG's Paeth filter to one scanline, for the decoder test."""
    bpp = 3
    current = image[row].astype(np.int32).ravel()
    prior = (
        image[row - 1].astype(np.int32).ravel() if row else np.zeros_like(current)
    )
    out = np.zeros_like(current)
    for i in range(current.size):
        left = current[i - bpp] if i >= bpp else 0
        up_left = prior[i - bpp] if i >= bpp else 0
        out[i] = (current[i] - ce._paeth(int(left), int(prior[i]), int(up_left))) & 0xFF
    return out.astype(np.uint8).tobytes()
