"""X6 style: fingerprinting, comparison and transfer.

The cluster splits three ways, and the labels say which is which:

:mod:`.fingerprint`
    **Real, default, CPU, no weights.** Palette, saturation, contrast, edge
    density and colour temperature measured from decoded pixels. PNG only —
    anything else is reported ``measured=False`` rather than invented.

:mod:`.clip_embedding`
    **Real, gated.** Semantic style embeddings via open_clip. Needs torch and
    a weights download; CPU-feasible once provisioned.

Style **transfer** is not implemented. Applying a style to a render needs a
diffusion model and a GPU, and no adapter exists here; those responses carry an
explicit mock marker.
"""

from __future__ import annotations

__all__ = ["clip_embedding", "fingerprint"]
