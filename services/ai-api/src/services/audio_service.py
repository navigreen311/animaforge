"""Service layer for AI audio generation and music composition.

Two different honesty states live in this module, and they are kept apart on
purpose:

* **Lip-sync phoneme timing is real** -- see :mod:`src.services.audio`. It runs
  on CPU with no weights, and :func:`generate_lip_sync_data` returns modelled
  or measured timings rather than a placeholder.
* **Speech synthesis and music composition are not implemented.** The jobs
  those endpoints create carry an explicit mock marker, and no audio file is
  produced or referenced.
"""

from __future__ import annotations

import uuid
from typing import Any

from ..models.audio_schemas import (
    AudioJob,
    CueSheet,
    GenerateAudioRequest,
    MusicScoreRequest,
)
from . import engines
from .audio import g2p, timing
from .audio.alignment import align, alignment_available

# ── Constants ────────────────────────────────────────────────────────────────

_PROCESSING_RATE_FACTOR: float = 0.4  # seconds of processing per second of audio


# ── Public API ───────────────────────────────────────────────────────────────


def create_audio_job(params: GenerateAudioRequest) -> AudioJob:
    """Create a speech-synthesis job.

    No audio is synthesised: there is no TTS adapter in this tree. The job is
    real bookkeeping around work that does not happen, so the record says so
    through :func:`engines.mock_marker` and carries no artifact URL.
    """
    duration_ms = _estimate_dialogue_duration_ms(params.dialogue)
    estimated = estimate_audio_time(duration_ms)

    return AudioJob(
        job_id=_new_job_id(),
        status="queued",
        shot_id=params.shot_id,
        estimated_seconds=estimated,
        engine=engines.mock_marker(
            "audio",
            detail=(
                "Speech synthesis is not implemented. Lip-sync phoneme timing "
                "for this dialogue is real and available from "
                "POST /ai/v1/audio/lip-sync."
            ),
        ),
    )


def create_music_job(params: MusicScoreRequest) -> AudioJob:
    """Create a music-composition job.

    The cue sheet is a plausible-looking placeholder, not an analysis of the
    cut at ``params.cut_url`` -- nothing downloads or decodes it. The marker on
    the job says so.
    """
    cue_sheet = CueSheet(
        title=f"{params.mood.title()} Score",
        duration_ms=180_000,  # default 3-minute score
        stems=params.stems,
        bpm=120,
        key="C minor",
    )
    estimated = estimate_audio_time(cue_sheet.duration_ms)

    return AudioJob(
        job_id=_new_job_id(),
        status="queued",
        project_id=params.project_id,
        estimated_seconds=estimated,
        cue_sheet=cue_sheet,
        engine=engines.mock_marker(
            "music",
            detail=(
                "Cue sheet values are placeholders. The cut at cut_url is not "
                "downloaded, decoded or analysed, so bpm, key and duration are "
                "not measurements of it."
            ),
        ),
    )


def generate_lip_sync_data(
    dialogue: str,
    *,
    speaking_rate: float = 1.0,
    audio_path: str | None = None,
) -> dict[str, Any]:
    """Produce a phoneme and viseme timeline for *dialogue*.

    This is a real implementation. It converts the text to ARPABET phonemes
    with a rule-based grapheme-to-phoneme pass, then lays them out with a
    segmental duration model that lengthens phrase-finally and word-finally.
    Both run on CPU with no model weights.

    When *audio_path* is given and the gated engine is provisioned, word
    boundaries are **measured** from the waveform by CTC forced alignment
    instead of modelled, and the phonemes inside each word are scaled to fit
    the measured span.

    Args:
        dialogue: The line to be spoken.
        speaking_rate: Multiplier; 1.2 is 20% faster.
        audio_path: Optional recording to align against.

    Returns:
        ``{"phonemes": [...], "source": ..., "engine": {...}}``. ``source`` is
        ``"forced-alignment"`` when boundaries were measured and
        ``"duration-model"`` when they were modelled.

    Raises:
        ValueError: if *speaking_rate* is not positive.
    """
    tokens = g2p.phonemise(dialogue)
    events = timing.schedule(tokens, speaking_rate=speaking_rate)

    if audio_path and alignment_available():
        aligned = align(audio_path, dialogue)
        return {
            "phonemes": _fit_to_alignment(events, aligned),
            "source": "forced-alignment",
            "engine": engines.real_marker(
                "audio",
                detail=(
                    "Word boundaries measured from the waveform by CTC forced "
                    "alignment."
                ),
            ),
        }

    marker = engines.real_marker(
        "audio",
        detail=(
            "Phonemes from rule-based G2P; durations from a segmental model. "
            "Supply audio_path with the gated engine provisioned to measure "
            "boundaries from a recording instead."
        ),
    )
    if audio_path:
        marker["alignment_skipped"] = (
            "audio_path was supplied but the forced-alignment engine is not "
            "provisioned on this host; timings are modelled, not measured."
        )

    return {"phonemes": events, "source": "duration-model", "engine": marker}


def _fit_to_alignment(
    events: list[dict[str, Any]], aligned: list[Any]
) -> list[dict[str, Any]]:
    """Scale each word's modelled phonemes into its measured span.

    Forced alignment gives word boundaries; the layout inside a word stays
    proportional to the duration model. That is honest about what was actually
    measured -- the word onsets and offsets -- without pretending the aligner
    resolved every phoneme boundary.
    """
    by_word: dict[str, list[dict[str, Any]]] = {}
    for event in events:
        by_word.setdefault(str(event["word"]), []).append(event)

    out: list[dict[str, Any]] = []
    for token in aligned:
        group = by_word.get(token.token) or by_word.get(token.token.lower())
        if not group:
            continue
        modelled = group[-1]["end_ms"] - group[0]["start_ms"]
        measured = token.end_ms - token.start_ms
        scale = (measured / modelled) if modelled > 0 else 1.0
        base = group[0]["start_ms"]
        for event in group:
            out.append(
                {
                    **event,
                    "start_ms": token.start_ms
                    + int((event["start_ms"] - base) * scale),
                    "end_ms": token.start_ms + int((event["end_ms"] - base) * scale),
                }
            )
    return out or events


def estimate_audio_time(duration_ms: int) -> float:
    """Estimate processing time in seconds for the given audio duration."""
    return round((duration_ms / 1000) * _PROCESSING_RATE_FACTOR, 2)


# ── Helpers ──────────────────────────────────────────────────────────────────


def _new_job_id() -> str:
    return f"audio-{uuid.uuid4().hex[:12]}"


def _estimate_dialogue_duration_ms(dialogue: str) -> int:
    """Rough heuristic: ~150 words per minute -> 400 ms per word."""
    word_count = len(dialogue.split())
    return max(word_count * 400, 1000)
