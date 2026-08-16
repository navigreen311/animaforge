"""Forced alignment of a transcript against a real waveform.

This is the gated upgrade to :mod:`.timing`. Where that module *models* typical
English durations, this one *measures* the actual boundaries in a recording,
using CTC forced alignment: an acoustic model emits per-frame token
probabilities, and the Viterbi path through them that spells the transcript
gives the true onset and offset of every token.

Requires ``torch`` and ``torchaudio`` (see ``requirements-ml.txt``) plus a
weights directory. It runs on CPU — forced alignment is far cheaper than
synthesis — but the bundle has to be downloaded once, which is why it is gated
rather than default.

**Not executed in CI**, and not executed on the machine this was written on:
neither has torch installed. The code is written against torchaudio's
documented ``forced_align`` API. Treat the first run on a provisioned host as
unverified, and see ``docs/generation-pipeline.md``.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from ..engines import EngineUnavailable, probe, upgrade_available

#: Sample rate the bundled acoustic models expect.
TARGET_SAMPLE_RATE = 16_000


@dataclass(frozen=True)
class AlignedToken:
    """One token with boundaries measured from the audio."""

    token: str
    start_ms: int
    end_ms: int
    score: float

    def as_dict(self) -> dict[str, object]:
        return {
            "token": self.token,
            "start_ms": self.start_ms,
            "end_ms": self.end_ms,
            "score": round(self.score, 4),
        }


def alignment_available() -> bool:
    """True when forced alignment can actually run on this host.

    Deliberately :func:`~..engines.upgrade_available` rather than
    ``real_engine_available``: D4 is real by default because the duration model
    needs nothing, so the latter is always True and would send every request
    down a path that immediately fails to import torch.
    """
    return upgrade_available("audio")


def align(audio_path: str, transcript: str) -> list[AlignedToken]:
    """Align *transcript* against the waveform at *audio_path*.

    Returns one entry per word, with boundaries measured from the audio rather
    than modelled.

    Raises:
        EngineUnavailable: if torch/torchaudio or the weights are missing.
        FileNotFoundError: if *audio_path* does not exist.
        ValueError: if *transcript* has no alignable words.
    """
    status = probe("audio")
    if not upgrade_available("audio"):
        raise EngineUnavailable(
            "Forced alignment needs the real audio engine. Missing: "
            + ", ".join(status.missing)
        )

    if not os.path.isfile(audio_path):
        raise FileNotFoundError(f"No audio file at {audio_path}")

    words = [w for w in transcript.split() if w.strip()]
    if not words:
        raise ValueError("transcript contains no words to align")

    # Imported here, not at module scope: this module is imported by
    # audio_service on every request and torch must not be a hard dependency of
    # the CPU path.
    import torch  # type: ignore[import-not-found]
    import torchaudio  # type: ignore[import-not-found]

    waveform, sample_rate = torchaudio.load(audio_path)
    if sample_rate != TARGET_SAMPLE_RATE:
        waveform = torchaudio.functional.resample(
            waveform, sample_rate, TARGET_SAMPLE_RATE
        )
    # Forced alignment is monophonic; average rather than dropping a channel so
    # a hard-panned voice is not lost.
    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)

    bundle = torchaudio.pipelines.MMS_FA
    model = bundle.get_model(with_star=False)
    model.eval()

    with torch.inference_mode():
        emission, _ = model(waveform)

    tokenizer = bundle.get_tokenizer()
    tokens = tokenizer([w.lower() for w in words])

    aligned, scores = torchaudio.functional.forced_align(
        emission,
        torch.tensor([[t for word in tokens for t in word]], dtype=torch.int32),
        blank=0,
    )

    spans = torchaudio.functional.merge_tokens(aligned[0], scores[0].exp())

    # emission frames -> milliseconds
    frames = emission.size(1)
    samples = waveform.size(1)
    ms_per_frame = (samples / TARGET_SAMPLE_RATE) * 1000.0 / max(frames, 1)

    out: list[AlignedToken] = []
    cursor = 0
    for word, word_tokens in zip(words, tokens):
        span = spans[cursor : cursor + len(word_tokens)]
        cursor += len(word_tokens)
        if not span:
            continue
        out.append(
            AlignedToken(
                token=word,
                start_ms=int(span[0].start * ms_per_frame),
                end_ms=int(span[-1].end * ms_per_frame),
                score=float(sum(s.score for s in span) / len(span)),
            )
        )

    return out
