"""D4 audio: phoneme timing for lip-sync, and speech synthesis.

The cluster splits in two, and the split is the honest part:

:mod:`.g2p` + :mod:`.timing`
    **Real, by default, on CPU, with no weights.** Rule-based
    grapheme-to-phoneme producing ARPABET, and a segmental duration model with
    phrase-final and word-final lengthening. This is what drives lip-sync when
    there is no recording yet — which is the normal case, since the mouth
    animation is usually needed to *drive* synthesis rather than to follow it.

:mod:`.alignment`
    **Real, gated.** Measures true phoneme boundaries from an actual waveform
    by CTC forced alignment. Needs torch + torchaudio and a weights directory.

Speech **synthesis** is not implemented at all. There is no TTS adapter in this
tree, and no amount of provisioning produces one. Responses that would have
carried synthesised audio carry an explicit mock marker instead, and
``GET /ai/v1/capabilities`` says the same thing.
"""

from __future__ import annotations

__all__ = ["alignment", "g2p", "timing"]
