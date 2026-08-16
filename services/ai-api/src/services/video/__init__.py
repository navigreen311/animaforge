"""D3/D6 video generation.

:mod:`.diffusion` is a real diffusers adapter behind ``VIDEO_ENGINE=real``. It
is gated on a CUDA GPU and several gigabytes of weights, so the default path
produces no video at all -- and says so, rather than returning a URL for a clip
that does not exist.
"""

from __future__ import annotations

__all__ = ["diffusion"]
