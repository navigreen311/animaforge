"""Phoneme duration modelling and viseme mapping for lip-sync.

The durations here are not a constant. The path this replaces gave every
"phoneme" 80 ms, which is wrong in both directions: a plosive burst is nearer
60 ms and a stressed tense vowel in phrase-final position runs past 200 ms. A
mouth rig driven by a constant reads as a flapping jaw rather than speech,
because the thing that makes articulation legible is precisely the *variation*.

The model is a segmental one in the tradition of Klatt (1979): each phoneme has
an intrinsic duration for its manner class, which is then modified by context.
Three effects are applied, all well attested:

* **Phrase-final lengthening** — the last syllable before a pause stretches,
  by around 40%.
* **Word-final lengthening** — smaller, around 10%.
* **Speaking rate** — a straight multiplier, so 1.2 is 20% faster.

Everything runs on CPU with no model weights. It is a model of typical English
timing, not a measurement of a particular speaker: when a real waveform is
available, :mod:`.alignment` measures the actual boundaries instead, and that
is strictly better. This is what you get before there is audio to align to —
which is the case that matters, because lip-sync is usually needed to *drive*
synthesis rather than to follow it.
"""

from __future__ import annotations

from .g2p import FRICATIVES, SILENCE, SONORANTS, STOPS, VOWELS

# ── Intrinsic durations, milliseconds ────────────────────────────────────────

#: Tense vowels are longer than lax ones; diphthongs longer still because they
#: are two targets in one segment.
_TENSE_VOWELS = frozenset({"IY", "UW", "AA", "AO", "ER"})
_DIPHTHONGS = frozenset({"AW", "AY", "EY", "OW", "OY"})

_BASE_MS: dict[str, int] = {
    "vowel_lax": 95,
    "vowel_tense": 135,
    "vowel_diphthong": 165,
    "stop": 70,
    "fricative": 110,
    "sonorant": 80,
    "silence": 120,
}

#: Affricates hold a stop closure and then release as a fricative, so they run
#: longer than either class alone.
_AFFRICATES = frozenset({"CH", "JH"})
_AFFRICATE_MS = 135

#: /h/ is short and weak; grouping it with the other fricatives overstates it.
_SHORT_FRICATIVES: dict[str, int] = {"HH": 70, "TH": 95, "DH": 75}

PHRASE_FINAL_LENGTHENING = 1.40
WORD_FINAL_LENGTHENING = 1.10

MIN_PHONEME_MS = 30


def intrinsic_duration_ms(phoneme: str) -> int:
    """Return the context-free duration of one ARPABET phoneme."""
    if phoneme == SILENCE:
        return _BASE_MS["silence"]
    if phoneme in _AFFRICATES:
        return _AFFRICATE_MS
    if phoneme in _SHORT_FRICATIVES:
        return _SHORT_FRICATIVES[phoneme]
    if phoneme in VOWELS:
        if phoneme in _DIPHTHONGS:
            return _BASE_MS["vowel_diphthong"]
        if phoneme in _TENSE_VOWELS:
            return _BASE_MS["vowel_tense"]
        return _BASE_MS["vowel_lax"]
    if phoneme in STOPS:
        return _BASE_MS["stop"]
    if phoneme in FRICATIVES:
        return _BASE_MS["fricative"]
    if phoneme in SONORANTS:
        return _BASE_MS["sonorant"]
    # An unknown symbol is given a mid-range duration rather than dropped, so
    # the timeline stays continuous.
    return _BASE_MS["sonorant"]


def schedule(
    tokens: list[tuple[str, tuple[str, ...]]],
    *,
    speaking_rate: float = 1.0,
    start_ms: int = 0,
) -> list[dict[str, object]]:
    """Lay phonemes out on a timeline.

    Args:
        tokens: ``(word, phonemes)`` pairs, as produced by :func:`.g2p.phonemise`.
        speaking_rate: Multiplier; 1.2 is 20% faster, so durations shorten.
        start_ms: Timeline offset of the first phoneme.

    Returns:
        One entry per phoneme with its word, viseme and millisecond bounds.

    Raises:
        ValueError: if *speaking_rate* is not positive.
    """
    if speaking_rate <= 0:
        raise ValueError(f"speaking_rate must be positive, got {speaking_rate}")

    events: list[dict[str, object]] = []
    cursor = start_ms

    for index, (word, phonemes) in enumerate(tokens):
        next_is_pause = (
            index + 1 < len(tokens) and tokens[index + 1][1] == (SILENCE,)
        )
        is_last_token = index == len(tokens) - 1

        for position, phoneme in enumerate(phonemes):
            duration = float(intrinsic_duration_ms(phoneme))
            last_in_word = position == len(phonemes) - 1

            if last_in_word:
                if next_is_pause or is_last_token:
                    duration *= PHRASE_FINAL_LENGTHENING
                else:
                    duration *= WORD_FINAL_LENGTHENING

            duration = max(MIN_PHONEME_MS, round(duration / speaking_rate))

            events.append(
                {
                    "phoneme": phoneme,
                    "viseme": viseme_for(phoneme),
                    "word": word,
                    "start_ms": cursor,
                    "end_ms": cursor + int(duration),
                }
            )
            cursor += int(duration)

    return events


# ── Visemes ──────────────────────────────────────────────────────────────────
#
# The Oculus/Meta 15-viseme set, which is what most real-time character rigs
# expose. Several phonemes share a viseme because they are visually
# indistinguishable — /p/, /b/ and /m/ all close the lips — and that is the
# property which makes a rule-based G2P usable here: a phoneme confusion within
# a viseme class has no effect on the rendered mouth.

VISEMES: tuple[str, ...] = (
    "sil", "PP", "FF", "TH", "DD", "kk", "CH",
    "SS", "nn", "RR", "aa", "E", "I", "O", "U",
)

_VISEME_MAP: dict[str, str] = {
    # Bilabial closure
    "P": "PP", "B": "PP", "M": "PP",
    # Labiodental
    "F": "FF", "V": "FF",
    # Dental
    "TH": "TH", "DH": "TH",
    # Alveolar
    "T": "DD", "D": "DD",
    # Velar
    "K": "kk", "G": "kk", "NG": "nn", "HH": "kk",
    # Postalveolar
    "CH": "CH", "JH": "CH", "SH": "CH", "ZH": "CH",
    # Sibilant
    "S": "SS", "Z": "SS",
    # Nasal / lateral
    "N": "nn", "L": "nn",
    # Rhotic
    "R": "RR", "ER": "RR",
    # Vowels
    "AA": "aa", "AE": "aa", "AH": "aa", "AY": "aa", "AW": "aa",
    "EH": "E", "EY": "E",
    "IH": "I", "IY": "I", "Y": "I",
    "AO": "O", "OW": "O", "OY": "O",
    "UH": "U", "UW": "U", "W": "U",
    SILENCE: "sil",
}


def viseme_for(phoneme: str) -> str:
    """Map an ARPABET phoneme to its Oculus viseme.

    Unknown symbols map to ``sil`` rather than guessing a mouth shape.
    """
    return _VISEME_MAP.get(phoneme, "sil")
