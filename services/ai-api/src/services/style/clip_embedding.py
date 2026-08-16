"""CLIP style embeddings — the gated upgrade to pixel statistics.

:mod:`.fingerprint` measures what a frame *looks like* numerically: palette,
contrast, edge density. That is real and runs anywhere, but it cannot tell you
that two shots share a *style* in the sense an artist means — "painterly", "80s
anime", "shot on 16mm" — because those are semantic properties, not histogram
properties.

CLIP embeddings can. This module loads an open_clip model and returns the image
embedding, which supports semantic nearest-neighbour and text-prompted style
matching.

Requires ``torch`` and ``open_clip_torch`` (``requirements-ml.txt``) plus a
weights directory. Embedding inference is CPU-feasible — a ViT-B/32 forward
pass on one frame is well under a second — so this is gated on the download and
the dependency, not on a GPU.

**Not executed in CI**, and not on the machine this was written on: neither has
torch. Written against open_clip's documented API. See
``docs/generation-pipeline.md``.
"""

from __future__ import annotations

import os
from typing import Any

from ..engines import EngineUnavailable, probe, upgrade_available

#: open_clip architecture and pretrained tag used when the env does not choose.
DEFAULT_MODEL = "ViT-B-32"
DEFAULT_PRETRAINED = "laion2b_s34b_b79k"


def clip_available() -> bool:
    """True when the CLIP path can actually run on this host.

    Deliberately :func:`~..engines.upgrade_available` rather than
    ``real_engine_available``: X6 is real by default because pixel statistics
    need nothing, so the latter is always True and says nothing about whether
    open_clip is installed.
    """
    return upgrade_available("style")


def embed_image(image_path: str) -> dict[str, Any]:
    """Return the CLIP embedding for an image.

    Raises:
        EngineUnavailable: if torch/open_clip or the weights are missing.
        FileNotFoundError: if *image_path* does not exist.
    """
    status = probe("style")
    if not upgrade_available("style"):
        raise EngineUnavailable(
            "CLIP style embedding needs the gated style engine. Missing: "
            + ", ".join(status.missing)
        )

    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"No image at {image_path}")

    # Imported lazily: style_intelligence imports this module on every request
    # and torch must never become a hard dependency of the CPU path.
    import open_clip  # type: ignore[import-not-found]
    import torch  # type: ignore[import-not-found]
    from PIL import Image  # type: ignore[import-not-found]

    model_name = os.getenv("STYLE_CLIP_MODEL", DEFAULT_MODEL)
    pretrained = os.getenv("STYLE_CLIP_PRETRAINED", DEFAULT_PRETRAINED)
    cache_dir = os.getenv("STYLE_WEIGHTS_DIR") or None

    model, _, preprocess = open_clip.create_model_and_transforms(
        model_name, pretrained=pretrained, cache_dir=cache_dir
    )
    model.eval()

    with Image.open(image_path) as handle:
        tensor = preprocess(handle.convert("RGB")).unsqueeze(0)

    with torch.inference_mode():
        features = model.encode_image(tensor)
        features = features / features.norm(dim=-1, keepdim=True)

    vector = features[0].tolist()
    return {
        "embedding": vector,
        "dims": len(vector),
        "model": f"{model_name}/{pretrained}",
    }
