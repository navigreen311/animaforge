"""X5 Avatar Studio — digital human reconstruction and rigging.

Subsystems:

1. :mod:`reconstruction` — multi-view 3D reconstruction (Gaussian splatting)
2. :mod:`sss`            — subsurface scattering skin parameters
3. :mod:`facs`           — FACS action units driving blendshape weights
4. :mod:`eyes`           — saccade / blink / pupil-dilation animation curves

Supporting modules: :mod:`engine` (capability probing and engine selection),
:mod:`gltf` (glTF 2.0 / GLB writer) and :mod:`storage` (artifact persistence).
"""

from __future__ import annotations

__all__ = [
    "engine",
    "eyes",
    "facs",
    "gltf",
    "reconstruction",
    "sss",
    "storage",
]
