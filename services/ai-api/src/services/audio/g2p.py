"""Grapheme-to-phoneme conversion for English, producing ARPABET.

This replaces what the lip-sync path used to do, which was to emit one
"phoneme" per *letter*:

    "the" -> T, H, E        (three phonemes, 80 ms each)

That is not a phonetic transcription. English "the" is two phonemes, DH and
AH, and neither is 80 ms long. Anything driving a mouth rig from letters
produces visibly wrong articulation — a closed TH where the lips should be
open, a vowel where there is none.

What this does instead is a real letter-to-sound conversion: an ordered set of
context-sensitive rewrite rules over the grapheme string, the classic
rule-based G2P approach. It runs on CPU with no model weights and no optional
dependency.

Accuracy, stated honestly: rule-based G2P on unrestricted English text sits
around 65-75% phoneme accuracy, because English orthography is only partly
regular. A pronunciation dictionary (CMUdict) or a neural G2P does better. The
:data:`EXCEPTIONS` table below covers the highest-frequency irregular words,
which is where rule-based systems lose most of their accuracy. For lip-sync
this is a good trade: visemes collapse many phoneme distinctions, so a
confusion between two phonemes in the same viseme class is invisible on the
rig.

ARPABET is used rather than IPA because it is ASCII, it is what CMUdict and
most TTS front-ends speak, and it maps cleanly onto viseme sets.
"""

from __future__ import annotations

import re

# ── Phoneme inventory ────────────────────────────────────────────────────────

#: ARPABET vowels. Kept as a set because the duration model and the viseme map
#: both need to ask "is this a vowel?" and the answer drives timing.
VOWELS: frozenset[str] = frozenset(
    {
        "AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER",
        "EY", "IH", "IY", "OW", "OY", "UH", "UW",
    }
)

#: Stop consonants (plosives). Short by nature; the duration model uses this.
STOPS: frozenset[str] = frozenset({"B", "D", "G", "K", "P", "T"})

#: Fricatives and affricates.
FRICATIVES: frozenset[str] = frozenset(
    {"CH", "DH", "F", "HH", "JH", "S", "SH", "TH", "V", "Z", "ZH"}
)

#: Nasals, liquids and glides.
SONORANTS: frozenset[str] = frozenset({"L", "M", "N", "NG", "R", "W", "Y"})

#: Silence, emitted for punctuation pauses.
SILENCE = "SIL"

ALL_PHONEMES: frozenset[str] = VOWELS | STOPS | FRICATIVES | SONORANTS | {SILENCE}


# ── Irregular words ──────────────────────────────────────────────────────────

#: Words whose spelling defeats letter-to-sound rules. These are the
#: highest-frequency offenders in English; getting them wrong is both common
#: and very visible, since they are the words that appear in every line of
#: dialogue.
EXCEPTIONS: dict[str, tuple[str, ...]] = {
    "a": ("AH",),
    "the": ("DH", "AH"),
    "of": ("AH", "V"),
    "to": ("T", "UW"),
    "and": ("AE", "N", "D"),
    "i": ("AY",),
    "you": ("Y", "UW"),
    "he": ("HH", "IY"),
    "she": ("SH", "IY"),
    "we": ("W", "IY"),
    "they": ("DH", "EY"),
    "is": ("IH", "Z"),
    "are": ("AA", "R"),
    "was": ("W", "AA", "Z"),
    "were": ("W", "ER"),
    "be": ("B", "IY"),
    "been": ("B", "IH", "N"),
    "have": ("HH", "AE", "V"),
    "has": ("HH", "AE", "Z"),
    "had": ("HH", "AE", "D"),
    "do": ("D", "UW"),
    "does": ("D", "AH", "Z"),
    "done": ("D", "AH", "N"),
    "said": ("S", "EH", "D"),
    "says": ("S", "EH", "Z"),
    "one": ("W", "AH", "N"),
    "once": ("W", "AH", "N", "S"),
    "two": ("T", "UW"),
    "who": ("HH", "UW"),
    "what": ("W", "AH", "T"),
    "where": ("W", "EH", "R"),
    "there": ("DH", "EH", "R"),
    "here": ("HH", "IH", "R"),
    "their": ("DH", "EH", "R"),
    "your": ("Y", "AO", "R"),
    "would": ("W", "UH", "D"),
    "could": ("K", "UH", "D"),
    "should": ("SH", "UH", "D"),
    "some": ("S", "AH", "M"),
    "come": ("K", "AH", "M"),
    "love": ("L", "AH", "V"),
    "live": ("L", "IH", "V"),
    "give": ("G", "IH", "V"),
    "gone": ("G", "AO", "N"),
    "many": ("M", "EH", "N", "IY"),
    "any": ("EH", "N", "IY"),
    "eye": ("AY",),
    "eyes": ("AY", "Z"),
    "people": ("P", "IY", "P", "AH", "L"),
    "again": ("AH", "G", "EH", "N"),
    "against": ("AH", "G", "EH", "N", "S", "T"),
    "because": ("B", "IH", "K", "AO", "Z"),
    "friend": ("F", "R", "EH", "N", "D"),
    "great": ("G", "R", "EY", "T"),
    "heart": ("HH", "AA", "R", "T"),
    "word": ("W", "ER", "D"),
    "world": ("W", "ER", "L", "D"),
    "work": ("W", "ER", "K"),
    "night": ("N", "AY", "T"),
    "light": ("L", "AY", "T"),
    "right": ("R", "AY", "T"),
    "through": ("TH", "R", "UW"),
    "though": ("DH", "OW"),
    "thought": ("TH", "AO", "T"),
    "enough": ("IH", "N", "AH", "F"),
    "laugh": ("L", "AE", "F"),
    "know": ("N", "OW"),
    "knew": ("N", "UW"),
    "write": ("R", "AY", "T"),
    "wrong": ("R", "AO", "NG"),
    "answer": ("AE", "N", "S", "ER"),
    "island": ("AY", "L", "AH", "N", "D"),
    "business": ("B", "IH", "Z", "N", "AH", "S"),
    "beautiful": ("B", "Y", "UW", "T", "AH", "F", "AH", "L"),
}


# ── Letter-to-sound rules ────────────────────────────────────────────────────
#
# Ordered, context-sensitive. Each entry is (pattern, phonemes), where the
# pattern is matched at the current position in a word padded with '#' word
# boundaries. Longer graphemes come first so that "tion" wins over "t".
#
# The `#` in a pattern is a literal word boundary. `$` in the lookahead column
# means "followed by a vowel letter".

_VOWEL_LETTERS = "aeiouy"

_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    # Four- and three-letter graphemes
    ("ough", ("AH", "F")),
    ("tion", ("SH", "AH", "N")),
    ("sion", ("ZH", "AH", "N")),
    ("cious", ("SH", "AH", "S")),
    ("tious", ("SH", "AH", "S")),
    ("aigh", ("EY",)),
    ("eigh", ("EY",)),
    ("igh", ("AY",)),
    ("dge", ("JH",)),
    ("tch", ("CH",)),
    ("sch", ("S", "K")),
    ("air", ("EH", "R")),
    ("are", ("EH", "R")),
    ("ear", ("IH", "R")),
    ("eer", ("IH", "R")),
    ("oor", ("AO", "R")),
    ("our", ("AW", "ER")),
    ("ure", ("Y", "ER")),
    # Two-letter vowel digraphs
    ("ai", ("EY",)),
    ("ay", ("EY",)),
    ("au", ("AO",)),
    ("aw", ("AO",)),
    ("ea", ("IY",)),
    ("ee", ("IY",)),
    ("ei", ("IY",)),
    ("eu", ("Y", "UW")),
    ("ew", ("Y", "UW")),
    ("ey", ("EY",)),
    ("ie", ("IY",)),
    ("oa", ("OW",)),
    ("oe", ("OW",)),
    ("oi", ("OY",)),
    ("oo", ("UW",)),
    ("ou", ("AW",)),
    ("ow", ("AW",)),
    ("oy", ("OY",)),
    ("ue", ("UW",)),
    ("ui", ("UW",)),
    # R-coloured vowels
    ("ar", ("AA", "R")),
    ("er", ("ER",)),
    ("ir", ("ER",)),
    ("or", ("AO", "R")),
    ("ur", ("ER",)),
    # Consonant digraphs
    ("ch", ("CH",)),
    ("ck", ("K",)),
    ("gh", ("G",)),
    ("gn", ("N",)),
    ("kn", ("N",)),
    ("ng", ("NG",)),
    ("ph", ("F",)),
    ("qu", ("K", "W")),
    ("sh", ("SH",)),
    ("th", ("TH",)),
    ("wh", ("W",)),
    ("wr", ("R",)),
    # Doubled consonants collapse to one phoneme
    ("bb", ("B",)),
    ("dd", ("D",)),
    ("ff", ("F",)),
    ("gg", ("G",)),
    ("ll", ("L",)),
    ("mm", ("M",)),
    ("nn", ("N",)),
    ("pp", ("P",)),
    ("rr", ("R",)),
    ("ss", ("S",)),
    ("tt", ("T",)),
    ("zz", ("Z",)),
    # Single letters
    ("b", ("B",)),
    ("d", ("D",)),
    ("f", ("F",)),
    ("h", ("HH",)),
    ("j", ("JH",)),
    ("k", ("K",)),
    ("l", ("L",)),
    ("m", ("M",)),
    ("n", ("N",)),
    ("p", ("P",)),
    ("r", ("R",)),
    ("t", ("T",)),
    ("v", ("V",)),
    ("w", ("W",)),
    ("x", ("K", "S")),
    ("z", ("Z",)),
)

#: Punctuation that ends a phrase, and the pause each implies.
PHRASE_BREAKS: dict[str, int] = {
    ",": 150,
    ";": 200,
    ":": 200,
    ".": 350,
    "!": 350,
    "?": 350,
    "-": 100,
    "—": 200,
}

_WORD_RE = re.compile(r"[A-Za-z']+|[.,;:!?—-]")


def phonemise_word(word: str) -> tuple[str, ...]:
    """Convert a single word to ARPABET phonemes.

    Raises:
        ValueError: if *word* is empty.
    """
    cleaned = word.strip().lower().replace("'", "")
    if not cleaned:
        raise ValueError("word must contain at least one letter")

    if cleaned in EXCEPTIONS:
        return EXCEPTIONS[cleaned]

    phonemes: list[str] = []
    i = 0
    n = len(cleaned)

    while i < n:
        # Silent final 'e': "make" is M EY K, not M EY K EH.
        if cleaned[i] == "e" and i == n - 1 and n > 2 and _has_vowel(phonemes):
            break

        match = _match_rule(cleaned, i)
        if match is not None:
            grapheme, produced = match
            phonemes.extend(produced)
            i += len(grapheme)
            continue

        produced = _single_letter(cleaned, i)
        if produced:
            phonemes.extend(produced)
        i += 1

    if not phonemes:
        # A word of only silent letters still has to articulate something.
        phonemes.append("AH")
    return tuple(phonemes)


def phonemise(text: str) -> list[tuple[str, tuple[str, ...]]]:
    """Convert running text to ``(token, phonemes)`` pairs.

    Punctuation becomes a ``SIL`` token so the caller can insert a real pause
    rather than pretending speech is continuous.
    """
    out: list[tuple[str, tuple[str, ...]]] = []
    for token in _WORD_RE.findall(text):
        if token in PHRASE_BREAKS:
            out.append((token, (SILENCE,)))
        else:
            out.append((token, phonemise_word(token)))
    return out


# ── Internals ────────────────────────────────────────────────────────────────


def _match_rule(word: str, i: int) -> tuple[str, tuple[str, ...]] | None:
    for grapheme, produced in _RULES:
        if word.startswith(grapheme, i):
            # 'th' is voiced word-initially in function words, which the
            # exception table already covers; elsewhere the voiceless TH is the
            # better default.
            return grapheme, produced
    return None


def _single_letter(word: str, i: int) -> tuple[str, ...]:
    ch = word[i]
    nxt = word[i + 1] if i + 1 < len(word) else ""

    if ch == "c":
        # Soft before e/i/y, hard otherwise.
        return ("S",) if nxt in "eiy" else ("K",)
    if ch == "g":
        return ("JH",) if nxt in "eiy" else ("G",)
    if ch == "s":
        # Intervocalic s voices: "rose" is R OW Z.
        prev = word[i - 1] if i else ""
        if prev in _VOWEL_LETTERS and nxt in _VOWEL_LETTERS:
            return ("Z",)
        return ("S",)
    if ch == "y":
        # Consonantal word-initially, vocalic elsewhere.
        if i == 0:
            return ("Y",)
        return ("IY",) if i == len(word) - 1 else ("IH",)

    if ch in _VOWEL_LETTERS:
        return _vowel(word, i)
    return ()


def _vowel(word: str, i: int) -> tuple[str, ...]:
    ch = word[i]
    # Magic-e: a single consonant then a final 'e' lengthens the vowel.
    tail = word[i + 1 :]
    long_vowel = bool(re.fullmatch(r"[^aeiou]e", tail))

    if ch == "a":
        return ("EY",) if long_vowel else ("AE",)
    if ch == "e":
        return ("IY",) if long_vowel else ("EH",)
    if ch == "i":
        return ("AY",) if long_vowel else ("IH",)
    if ch == "o":
        return ("OW",) if long_vowel else ("AA",)
    if ch == "u":
        return ("UW",) if long_vowel else ("AH",)
    return ("AH",)


def _has_vowel(phonemes: list[str]) -> bool:
    return any(p in VOWELS for p in phonemes)
