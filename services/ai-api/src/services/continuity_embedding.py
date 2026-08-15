"""E6 -- perceptual descriptors computed from pixels.

``continuity_service._mock_embedding`` hashes the *identifier* of a shot, so
two frames from the same take get uncorrelated vectors and two frames from
unrelated films get correlated ones about as often. Every continuity score
built on it was a function of the URL string, not of what was on screen.

This computes a descriptor from the image itself. It is handcrafted, not
learned, and the docstrings say so: three complementary views of a frame,
concatenated and L2-normalised.

``colour`` (48 dims)
    Per-channel 16-bin histograms. Catches a grade or white-balance jump
    between shots that should match.
``layout`` (48 dims)
    Mean RGB over a 4x4 spatial grid. Catches a subject or horizon that moved
    when it should not have.
``texture`` (8 dims)
    Histogram of Sobel gradient magnitude. Catches a focus or detail-level
    change -- a soft plate cut against a sharp one.

Cosine similarity between two of these is a real measurement of how alike two
frames look. What it is *not* is semantic: it cannot tell you the same actor is
wearing a different jacket if the colours happen to match. That needs CLIP,
which is the gated upgrade behind CONTINUITY_ENGINE=real, and the capability
report says which one produced any given score.

PNG decoding uses zlib from the standard library, so this runs with numpy
alone. JPEG needs a real decoder and is reported unmeasurable rather than
guessed at.
"""

from __future__ import annotations

import struct
import zlib
from typing import Any

import numpy as np

#: Bin counts, which fix the descriptor length at 48 + 48 + 8 = 104.
_COLOUR_BINS = 16
_GRID = 4
_TEXTURE_BINS = 8
DESCRIPTOR_DIMS = _COLOUR_BINS * 3 + _GRID * _GRID * 3 + _TEXTURE_BINS


def perceptual_descriptor(image: np.ndarray) -> np.ndarray:
    """Compute the 104-dim descriptor for an (h, w, 3) or (h, w) image."""
    array = np.asarray(image, dtype=np.float64)
    if array.ndim == 2:
        array = np.repeat(array[:, :, np.newaxis], 3, axis=2)
    if array.ndim != 3 or array.shape[2] < 3:
        raise ValueError(f"expected (h, w, 3) or (h, w), got shape {array.shape}")
    array = array[:, :, :3]
    if array.max() > 1.5:
        array = array / 255.0
    array = np.clip(array, 0.0, 1.0)

    height, width, _ = array.shape
    if height < _GRID or width < _GRID:
        raise ValueError(f"image must be at least {_GRID}x{_GRID}, got {height}x{width}")

    colour = np.concatenate([
        np.histogram(array[:, :, c], bins=_COLOUR_BINS, range=(0.0, 1.0))[0]
        for c in range(3)
    ]).astype(np.float64)
    colour /= max(1.0, colour.sum())

    rows = np.array_split(np.arange(height), _GRID)
    cols = np.array_split(np.arange(width), _GRID)
    layout = np.array([
        array[np.ix_(r, c)].mean(axis=(0, 1)) for r in rows for c in cols
    ]).ravel()

    luma = 0.299 * array[:, :, 0] + 0.587 * array[:, :, 1] + 0.114 * array[:, :, 2]
    gy, gx = np.gradient(luma)
    magnitude = np.hypot(gx, gy)
    texture = np.histogram(magnitude, bins=_TEXTURE_BINS, range=(0.0, 1.0))[0].astype(
        np.float64
    )
    texture /= max(1.0, texture.sum())

    descriptor = np.concatenate([colour, layout, texture])
    norm = np.linalg.norm(descriptor)
    return descriptor / norm if norm > 0 else descriptor


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity, clamped to [-1, 1] against floating-point drift."""
    a = np.asarray(a, dtype=np.float64)
    b = np.asarray(b, dtype=np.float64)
    denominator = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denominator == 0.0:
        return 0.0
    return float(np.clip(np.dot(a, b) / denominator, -1.0, 1.0))


# ---------------------------------------------------------------------------
# PNG decoding
# ---------------------------------------------------------------------------

_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
#: Bytes per pixel by PNG colour type, for 8-bit depth.
_CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}


def read_png(path: str) -> np.ndarray | None:
    """Decode an 8-bit non-interlaced PNG to an (h, w, 3) uint8 array.

    Returns None for anything else -- palette images, 16-bit, interlaced. The
    point is to make the common render output measurable without a new
    dependency, not to be a general decoder, and refusing loudly beats
    returning something approximate.
    """
    try:
        with open(path, "rb") as handle:
            data = handle.read()
    except OSError:
        return None

    if len(data) < 8 or data[:8] != _PNG_MAGIC:
        return None

    pos = 8
    header: tuple[int, int, int, int] | None = None
    idat = bytearray()

    while pos + 8 <= len(data):
        (length,) = struct.unpack(">I", data[pos : pos + 4])
        chunk_type = data[pos + 4 : pos + 8]
        body = data[pos + 8 : pos + 8 + length]

        if chunk_type == b"IHDR" and length >= 13:
            width, height, depth, colour_type, _comp, _filt, interlace = struct.unpack(
                ">IIBBBBB", body[:13]
            )
            if depth != 8 or interlace != 0 or colour_type not in _CHANNELS:
                return None
            if colour_type == 3:  # palette; needs the PLTE chunk applied
                return None
            header = (width, height, colour_type, _CHANNELS[colour_type])
        elif chunk_type == b"IDAT":
            idat += body
        elif chunk_type == b"IEND":
            break

        pos += 12 + length  # length + type + data + crc

    if header is None or not idat:
        return None

    width, height, _colour_type, channels = header
    try:
        raw = zlib.decompress(bytes(idat))
    except zlib.error:
        return None

    stride = width * channels
    if len(raw) < height * (stride + 1):
        return None

    out = np.zeros((height, stride), dtype=np.uint8)
    previous = np.zeros(stride, dtype=np.uint8)
    offset = 0
    for row in range(height):
        filter_type = raw[offset]
        line = np.frombuffer(raw[offset + 1 : offset + 1 + stride], dtype=np.uint8).copy()
        offset += 1 + stride
        out[row] = _unfilter(filter_type, line, previous, channels)
        previous = out[row]

    image = out.reshape(height, width, channels)
    if channels == 1:
        return np.repeat(image, 3, axis=2)
    if channels == 2:  # grey + alpha
        return np.repeat(image[:, :, :1], 3, axis=2)
    return image[:, :, :3]


def _unfilter(
    filter_type: int, line: np.ndarray, previous: np.ndarray, bpp: int
) -> np.ndarray:
    """Reverse one PNG scanline filter (RFC 2083 section 6).

    Sub, Average and Paeth reference the pixel to the left, which is itself
    being reconstructed -- so those three are inherently sequential and cannot
    be vectorised away.
    """
    if filter_type == 0:
        return line
    out = line.astype(np.int32)
    prior = previous.astype(np.int32)

    if filter_type == 1:  # Sub
        for i in range(bpp, out.size):
            out[i] = (out[i] + out[i - bpp]) & 0xFF
    elif filter_type == 2:  # Up
        out = (out + prior) & 0xFF
    elif filter_type == 3:  # Average
        for i in range(out.size):
            left = out[i - bpp] if i >= bpp else 0
            out[i] = (out[i] + ((left + prior[i]) >> 1)) & 0xFF
    elif filter_type == 4:  # Paeth
        for i in range(out.size):
            left = out[i - bpp] if i >= bpp else 0
            up_left = prior[i - bpp] if i >= bpp else 0
            out[i] = (out[i] + _paeth(left, int(prior[i]), up_left)) & 0xFF
    else:
        raise ValueError(f"unknown PNG filter type {filter_type}")

    return out.astype(np.uint8)


def _paeth(a: int, b: int, c: int) -> int:
    """The Paeth predictor: pick whichever neighbour the gradient favours."""
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    return b if pb <= pc else c


# ---------------------------------------------------------------------------
# Reference resolution
# ---------------------------------------------------------------------------


def describe_reference(reference: str) -> dict[str, Any]:
    """Produce a descriptor for a shot reference, saying how it was obtained.

    Returns ``{"descriptor": ndarray|None, "measured": bool, "reason": str}``.
    ``measured=False`` means the reference could not be decoded, and the caller
    must label any score derived from it as unmeasured rather than presenting
    it as a comparison of images.
    """
    from src.services.qc_measurement import resolve_artifact

    path, reason = resolve_artifact(reference)
    if path is None:
        return {"descriptor": None, "measured": False, "reason": reason}

    image = read_png(path)
    if image is None:
        return {
            "descriptor": None,
            "measured": False,
            "reason": (
                f"{path} is not an 8-bit non-interlaced PNG; JPEG and other "
                "formats need an image decoder that is not a dependency of "
                "this service"
            ),
        }

    try:
        descriptor = perceptual_descriptor(image)
    except ValueError as exc:
        return {"descriptor": None, "measured": False, "reason": str(exc)}

    return {
        "descriptor": descriptor,
        "measured": True,
        "reason": "",
        "shape": list(image.shape),
    }
