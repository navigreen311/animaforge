"""F3 music generation.

:mod:`.generation` is a real audiocraft/MusicGen adapter behind
``MUSIC_ENGINE=real``, gated on the checkpoint download. Unprovisioned, no
audio is produced and no URL is returned.
"""

from __future__ import annotations

__all__ = ["generation"]
