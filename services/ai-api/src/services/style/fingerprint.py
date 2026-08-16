"""X6 style fingerprinting, computed from actual pixels.

What this replaces returned a fingerprint derived from a hash of the URL:

    rng = random.Random(_seed_from_url(video_url))
    color_palette=_random_palette(rng)

Deterministic, and completely unrelated to the image. Two different renders of
the same shot got different palettes; the same URL with different content got
identical ones. Any downstream "style drift" number computed from that was
measuring the spelling of a URL.

Everything here is measured from decoded pixels with numpy, on CPU, with no
model weights:

* **Palette** by k-means over subsampled pixels — the colours actually present,
  in proportion to how much of the frame they occupy.
* **Saturation, brightness, contrast** from HSV/luma statistics.
* **Edge density** from gradient magnitude, which separates flat cel shading
  from detailed rendering.
* **Colour temperature** from the red/blue balance.

Decoding reuses :mod:`src.services.continuity_embedding`, which ships a
pure-Python PNG reader. **JPEG and video are not decodable here** — that needs
an image/video decoder this service does not depend on — and a reference that
cannot be decoded is reported ``measured=False`` rather than being given
invented numbers. That distinction is the whole point of this module.

CLIP embedding, in :mod:`.clip_embedding`, is the gated upgrade for semantic
style similarity.
"""

from __future__ import annotations

from typing import Any

import numpy as np

#: Number of palette entries extracted.
PALETTE_SIZE = 5

#: Pixels sampled for k-means. Enough to be stable, small enough to stay fast
#: on a CPU with no BLAS assumptions.
_SAMPLE_PIXELS = 4096

_KMEANS_ITERATIONS = 12


def style_fingerprint(image: np.ndarray) -> dict[str, Any]:
    """Compute a style fingerprint from an ``(h, w, 3)`` image.

    Raises:
        ValueError: if the array is not an image of at least 4x4.
    """
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
    if height < 4 or width < 4:
        raise ValueError(f"image must be at least 4x4, got {height}x{width}")

    luma = 0.299 * array[:, :, 0] + 0.587 * array[:, :, 1] + 0.114 * array[:, :, 2]

    channel_max = array.max(axis=2)
    channel_min = array.min(axis=2)
    saturation = np.where(channel_max > 0, (channel_max - channel_min) / channel_max, 0.0)

    gy, gx = np.gradient(luma)
    edges = np.hypot(gx, gy)

    palette, weights = _palette(array)

    mean_r = float(array[:, :, 0].mean())
    mean_b = float(array[:, :, 2].mean())
    # Positive is warm (red-dominant), negative cool. Bounded by construction.
    temperature = float(np.clip((mean_r - mean_b) * 2.0, -1.0, 1.0))

    return {
        "color_palette": palette,
        "palette_weights": [round(w, 4) for w in weights],
        "saturation": round(float(saturation.mean()), 4),
        "brightness": round(float(luma.mean()), 4),
        # Standard deviation of luma is the standard global contrast measure.
        "contrast": round(float(luma.std()), 4),
        "edge_density": round(float((edges > 0.08).mean()), 4),
        "texture_energy": round(float(edges.mean()), 4),
        "color_temperature": round(temperature, 4),
        "resolution": [int(width), int(height)],
    }


def fingerprint_reference(reference: str) -> dict[str, Any]:
    """Fingerprint a shot reference, saying how the answer was obtained.

    Returns ``{"fingerprint": {...}|None, "measured": bool, "reason": str}``.
    ``measured=False`` means the reference could not be decoded; the caller
    must not present anything derived from it as a measurement.
    """
    from src.services.continuity_embedding import read_png
    from src.services.qc_measurement import resolve_artifact

    path, reason = resolve_artifact(reference)
    if path is None:
        return {"fingerprint": None, "measured": False, "reason": reason}

    image = read_png(path)
    if image is None:
        return {
            "fingerprint": None,
            "measured": False,
            "reason": (
                f"{path} is not an 8-bit non-interlaced PNG. JPEG and video "
                "need a decoder that is not a dependency of this service, so "
                "no style attributes were measured from it."
            ),
        }

    try:
        fingerprint = style_fingerprint(image)
    except ValueError as exc:
        return {"fingerprint": None, "measured": False, "reason": str(exc)}

    return {"fingerprint": fingerprint, "measured": True, "reason": ""}


def compare(first: dict[str, Any], second: dict[str, Any]) -> dict[str, Any]:
    """Compare two measured fingerprints attribute by attribute.

    Scalars are compared as ``1 - |a - b|`` over their natural range; the
    palette is compared by mean nearest-colour distance in RGB.
    """
    scalars = (
        "saturation",
        "brightness",
        "contrast",
        "edge_density",
        "texture_energy",
    )
    per_dimension = {
        key: round(1.0 - min(1.0, abs(first[key] - second[key])), 4) for key in scalars
    }
    # Temperature spans [-1, 1], so its difference is halved to share the scale.
    per_dimension["color_temperature"] = round(
        1.0 - min(1.0, abs(first["color_temperature"] - second["color_temperature"]) / 2),
        4,
    )
    per_dimension["color_palette"] = round(
        _palette_similarity(first["color_palette"], second["color_palette"]), 4
    )

    overall = round(sum(per_dimension.values()) / len(per_dimension), 4)
    return {"overall": overall, "per_dimension": per_dimension}


# ── Internals ────────────────────────────────────────────────────────────────


def _palette(array: np.ndarray) -> tuple[list[str], list[float]]:
    """k-means palette extraction over a deterministic subsample."""
    pixels = array.reshape(-1, 3)
    if pixels.shape[0] > _SAMPLE_PIXELS:
        # Even stride rather than random choice: the result must be
        # reproducible for the same image without carrying a seed around.
        stride = pixels.shape[0] // _SAMPLE_PIXELS
        pixels = pixels[::stride][:_SAMPLE_PIXELS]

    k = min(PALETTE_SIZE, pixels.shape[0])
    # Deterministic init: spread the seeds along luma so the clusters do not
    # all start inside one colour region.
    luma = pixels @ np.array([0.299, 0.587, 0.114])
    centroids = pixels[np.argsort(luma)][
        np.linspace(0, pixels.shape[0] - 1, k).astype(int)
    ].copy()

    labels = np.zeros(pixels.shape[0], dtype=np.int64)
    for _ in range(_KMEANS_ITERATIONS):
        distances = ((pixels[:, None, :] - centroids[None, :, :]) ** 2).sum(axis=2)
        new_labels = distances.argmin(axis=1)
        if np.array_equal(new_labels, labels):
            break
        labels = new_labels
        for index in range(k):
            member = pixels[labels == index]
            if member.size:
                centroids[index] = member.mean(axis=0)

    counts = np.bincount(labels, minlength=k).astype(np.float64)
    order = np.argsort(-counts)
    total = max(1.0, counts.sum())

    hexes = [_to_hex(centroids[i]) for i in order]
    weights = [float(counts[i] / total) for i in order]
    return hexes, weights


def _to_hex(rgb: np.ndarray) -> str:
    r, g, b = (round(float(c) * 255) for c in np.clip(rgb, 0.0, 1.0))
    return f"#{r:02X}{g:02X}{b:02X}"


def _from_hex(value: str) -> np.ndarray:
    text = value.lstrip("#")
    return np.array([int(text[i : i + 2], 16) / 255.0 for i in (0, 2, 4)])


def _palette_similarity(first: list[str], second: list[str]) -> float:
    if not first or not second:
        return 0.0
    a = np.array([_from_hex(c) for c in first])
    b = np.array([_from_hex(c) for c in second])
    # Mean nearest-neighbour distance, symmetric, normalised by the largest
    # possible RGB distance.
    forward = np.sqrt(((a[:, None, :] - b[None, :, :]) ** 2).sum(axis=2)).min(axis=1)
    backward = np.sqrt(((b[:, None, :] - a[None, :, :]) ** 2).sum(axis=2)).min(axis=1)
    mean_distance = float((forward.mean() + backward.mean()) / 2)
    return max(0.0, 1.0 - mean_distance / np.sqrt(3.0))
