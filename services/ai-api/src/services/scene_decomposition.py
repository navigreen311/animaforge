"""E3 -- the structured layer between a prompt and a render.

``scene_graph_engine`` already does real 3D reasoning: layout, occlusion,
frustums, composition rules, depth, interpolation. What it never had was
anything that *produces* a scene graph. Every one of its endpoints takes a
scene graph as input, so the step from "a sentence a director typed" to "a
structured scene the renderer can consume" did not exist.

This module is that step. It decomposes a prompt into the ten fields the
product spec names -- subject, environment, camera, lens, action, emotional
beat, timing, dialogue cue, lighting state, continuity dependency -- and emits
a scene graph in the shape :func:`scene_graph_engine.parse_scene_graph`
accepts.

It is deterministic and needs no model. Every inference is a lexicon or a rule,
and every field records how it was derived:

``matched``
    A token in the prompt selected this value.
``derived``
    A rule computed it from another field (lens from shot size, key light from
    time of day).
``default``
    Nothing in the prompt spoke to it, so the field carries a conventional
    value.

That provenance is the honest part. A caller can tell "the director asked for a
close-up" from "we assumed a medium shot because nobody said", which a bare
value cannot express, and which matters when the next stage spends GPU-hours
on the assumption.
"""

from __future__ import annotations

import hashlib
import re
from typing import Any

# ---------------------------------------------------------------------------
# Lexicons
# ---------------------------------------------------------------------------

#: Shot size -> (canonical name, default focal length mm, subject framing).
SHOT_SIZES: dict[str, tuple[str, int, str]] = {
    "extreme close": ("extreme_close_up", 100, "eyes to chin"),
    "extreme close-up": ("extreme_close_up", 100, "eyes to chin"),
    "ecu": ("extreme_close_up", 100, "eyes to chin"),
    "close-up": ("close_up", 85, "head and shoulders"),
    "close up": ("close_up", 85, "head and shoulders"),
    "closeup": ("close_up", 85, "head and shoulders"),
    "cu": ("close_up", 85, "head and shoulders"),
    "medium close": ("medium_close_up", 50, "chest up"),
    "medium shot": ("medium", 40, "waist up"),
    "mid shot": ("medium", 40, "waist up"),
    "cowboy": ("medium_long", 35, "mid-thigh up"),
    "full shot": ("full", 28, "head to toe"),
    "wide shot": ("wide", 24, "figure in setting"),
    "wide": ("wide", 24, "figure in setting"),
    "establishing": ("establishing", 18, "setting dominant"),
    "extreme wide": ("extreme_wide", 14, "figure small in landscape"),
    "aerial": ("aerial", 20, "overhead"),
    "drone": ("aerial", 20, "overhead"),
}

#: Camera angle keywords.
CAMERA_ANGLES: dict[str, str] = {
    "low angle": "low",
    "high angle": "high",
    "overhead": "overhead",
    "bird's eye": "overhead",
    "birds eye": "overhead",
    "worm's eye": "extreme_low",
    "eye level": "eye_level",
    "dutch": "dutch",
    "canted": "dutch",
    "over the shoulder": "over_shoulder",
    "over-the-shoulder": "over_shoulder",
    "pov": "point_of_view",
    "point of view": "point_of_view",
}

#: Camera movement keywords.
CAMERA_MOVES: dict[str, str] = {
    "dolly in": "dolly_in",
    "dolly out": "dolly_out",
    "push in": "dolly_in",
    "pull back": "dolly_out",
    "pull out": "dolly_out",
    "truck": "truck",
    "tracking": "tracking",
    "track": "tracking",
    "follows": "tracking",
    "following": "tracking",
    "pan": "pan",
    "tilt": "tilt",
    "crane": "crane",
    "handheld": "handheld",
    "steadicam": "steadicam",
    "zoom in": "zoom_in",
    "zoom out": "zoom_out",
    "orbit": "orbit",
    "circles": "orbit",
    "static": "static",
    "locked off": "static",
}

#: Time of day -> (canonical, colour temperature K, key light elevation deg).
TIMES_OF_DAY: dict[str, tuple[str, int, int]] = {
    "dawn": ("dawn", 3200, 8),
    "sunrise": ("dawn", 3200, 8),
    "morning": ("morning", 5000, 35),
    "midday": ("midday", 5600, 80),
    "noon": ("midday", 5600, 80),
    "afternoon": ("afternoon", 5200, 50),
    "golden hour": ("golden_hour", 3000, 10),
    "sunset": ("sunset", 2800, 5),
    "dusk": ("dusk", 4500, -2),
    "twilight": ("dusk", 4500, -2),
    "night": ("night", 4000, -10),
    "midnight": ("night", 4000, -10),
}

WEATHER = (
    "rain", "raining", "storm", "snow", "snowing", "fog", "foggy", "mist",
    "misty", "overcast", "cloudy", "clear", "sunny", "windy",
)

INTERIOR_HINTS = (
    "room", "kitchen", "office", "hallway", "corridor", "bedroom", "bar",
    "cafe", "warehouse", "interior", "indoors", "inside", "lab", "cabin",
    "church", "library", "studio", "basement", "attic",
)

EXTERIOR_HINTS = (
    "street", "forest", "beach", "desert", "mountain", "field", "rooftop",
    "exterior", "outdoors", "outside", "city", "park", "river", "alley",
    "highway", "courtyard", "garden", "bridge",
)

#: Emotional beat -> (valence -1..1, arousal 0..1).
EMOTIONAL_BEATS: dict[str, tuple[float, float]] = {
    "joy": (0.8, 0.6), "joyful": (0.8, 0.6), "happy": (0.7, 0.5),
    "triumphant": (0.9, 0.8), "hopeful": (0.6, 0.4), "tender": (0.6, 0.2),
    "calm": (0.3, 0.1), "serene": (0.4, 0.1), "wistful": (0.0, 0.2),
    "melancholy": (-0.5, 0.2), "sad": (-0.6, 0.3), "grief": (-0.9, 0.4),
    "lonely": (-0.5, 0.2), "tense": (-0.3, 0.8), "anxious": (-0.4, 0.7),
    "afraid": (-0.7, 0.9), "terrified": (-0.9, 1.0), "angry": (-0.6, 0.9),
    "furious": (-0.8, 1.0), "menacing": (-0.7, 0.6), "urgent": (-0.2, 0.9),
    "frantic": (-0.4, 1.0), "determined": (0.4, 0.7), "defiant": (0.3, 0.8),
    "awe": (0.7, 0.6), "wonder": (0.7, 0.5), "surprised": (0.2, 0.8),
    "confused": (-0.2, 0.5), "exhausted": (-0.4, 0.1), "resigned": (-0.4, 0.2),
}

#: Action verbs worth extracting, kept to physical/screen-visible ones.
ACTION_VERBS = (
    "walks", "walking", "runs", "running", "sprints", "stands", "standing",
    "sits", "sitting", "turns", "turning", "reaches", "reaching", "opens",
    "closes", "looks", "looking", "stares", "watches", "falls", "falling",
    "climbs", "climbing", "jumps", "throws", "catches", "drops", "lifts",
    "enters", "exits", "leaves", "arrives", "kneels", "rises", "collapses",
    "embraces", "pushes", "pulls", "drives", "rides", "flies", "swims",
    "dances", "fights", "shouts", "whispers", "speaks", "smiles", "cries",
)

#: Continuity cues -- phrases that make this shot depend on a previous one.
CONTINUITY_CUES = (
    "same", "again", "still", "continues", "continuing", "returns",
    "back to", "later", "moments later", "meanwhile", "as before",
    "from the previous", "reverse angle", "matching", "match cut",
)

#: Rough words-per-second for dialogue timing.
_SPEAKING_RATE_WPS = 2.5
#: Floor and ceiling on an inferred shot duration, in seconds.
_MIN_DURATION_S = 1.5
_MAX_DURATION_S = 20.0


# ---------------------------------------------------------------------------
# Field helpers
# ---------------------------------------------------------------------------


def _field(value: Any, source: str, evidence: str | None = None) -> dict[str, Any]:
    """Wrap a value with how it was arrived at."""
    out: dict[str, Any] = {"value": value, "source": source}
    if evidence:
        out["evidence"] = evidence
    return out


def _first_match(
    text: str, table: dict[str, Any], *, inflect: bool = False
) -> tuple[Any, str] | None:
    """Return (mapped_value, matched_phrase) for the longest matching key.

    Longest-first so "extreme close-up" wins over "close-up", and "medium
    close" over "medium shot" -- shortest-first would mislabel the framing.

    With *inflect*, the leading token of a key also matches its regular
    third-person and progressive forms, so "push in" catches "pushes in" and
    "pushing in". Directors write prose, not lexicon keys.
    """
    for key in sorted(table, key=len, reverse=True):
        pattern = _inflected_pattern(key) if inflect else rf"\b{re.escape(key)}\b"
        if re.search(pattern, text):
            return table[key], key
    return None


#: Camera verbs whose third-person form is not the regular +s.
_IRREGULAR_VERBS = {"dolly": "dollies"}


def _inflected_pattern(key: str) -> str:
    """Build a regex for *key* allowing regular inflection of its first word."""
    head, _, tail = key.partition(" ")
    forms = {head, head + "s", head + "es", head + "ing"}
    if head.endswith("y"):
        forms.add(head[:-1] + "ies")
    if head in _IRREGULAR_VERBS:
        forms.add(_IRREGULAR_VERBS[head])
    alternation = "|".join(re.escape(f) for f in sorted(forms, key=len, reverse=True))
    suffix = rf"\s+{re.escape(tail)}" if tail else ""
    return rf"\b(?:{alternation}){suffix}\b"


# ---------------------------------------------------------------------------
# The ten fields
# ---------------------------------------------------------------------------


def _extract_subjects(text: str, original: str) -> dict[str, Any]:
    """Pull the people/things the shot is about.

    Capitalised words in the original are treated as named characters; a small
    set of common nouns catches the unnamed ones.
    """
    named = [
        w for w in re.findall(r"\b[A-Z][a-z]{2,}\b", original)
        # Sentence-initial words are capitalised by grammar, not by being names.
        if not original.strip().startswith(w)
    ]
    common = [
        n for n in (
            "woman", "man", "girl", "boy", "child", "figure", "person",
            "soldier", "detective", "dancer", "rider", "crowd", "dog", "cat",
            "horse", "robot", "creature", "ship", "car",
        )
        if re.search(rf"\b{n}s?\b", text)
    ]

    subjects = []
    for name in dict.fromkeys(named):
        subjects.append({"id": _slug(name), "label": name, "kind": "character"})
    for noun in dict.fromkeys(common):
        subjects.append({"id": _slug(noun), "label": noun, "kind": "character"})

    if subjects:
        return _field(subjects, "matched", ", ".join(s["label"] for s in subjects))
    return _field(
        [{"id": "subject_1", "label": "unnamed subject", "kind": "character"}],
        "default",
    )


def _extract_environment(text: str) -> dict[str, Any]:
    interior = any(re.search(rf"\b{h}\b", text) for h in INTERIOR_HINTS)
    exterior = any(re.search(rf"\b{h}\b", text) for h in EXTERIOR_HINTS)

    located = [h for h in INTERIOR_HINTS + EXTERIOR_HINTS if re.search(rf"\b{h}\b", text)]
    weather = [w for w in WEATHER if re.search(rf"\b{w}\b", text)]
    tod = _first_match(text, TIMES_OF_DAY)

    if interior and not exterior:
        setting, setting_source = "interior", "matched"
    elif exterior and not interior:
        setting, setting_source = "exterior", "matched"
    elif interior and exterior:
        setting, setting_source = "mixed", "matched"
    else:
        setting, setting_source = "unspecified", "default"

    return {
        "setting": _field(setting, setting_source, ", ".join(located) or None),
        "location_terms": _field(located, "matched" if located else "default"),
        "time_of_day": (
            _field(tod[0][0], "matched", tod[1]) if tod
            else _field("unspecified", "default")
        ),
        "weather": _field(weather, "matched" if weather else "default"),
    }


def _extract_camera(text: str) -> dict[str, Any]:
    size = _first_match(text, SHOT_SIZES)
    angle = _first_match(text, CAMERA_ANGLES)
    move = _first_match(text, CAMERA_MOVES, inflect=True)

    return {
        "shot_size": (
            _field(size[0][0], "matched", size[1]) if size
            else _field("medium", "default")
        ),
        "framing": (
            _field(size[0][2], "derived", f"from shot size {size[0][0]}") if size
            else _field("waist up", "default")
        ),
        "angle": (
            _field(angle[0], "matched", angle[1]) if angle
            else _field("eye_level", "default")
        ),
        "movement": (
            _field(move[0], "matched", move[1]) if move
            else _field("static", "default")
        ),
    }


def _derive_lens(camera: dict[str, Any], text: str) -> dict[str, Any]:
    """Lens follows from shot size unless the prompt names a focal length."""
    explicit = re.search(r"\b(\d{2,3})\s?mm\b", text)
    size_name = camera["shot_size"]["value"]
    default_mm = next(
        (mm for _, (canon, mm, _f) in SHOT_SIZES.items() if canon == size_name), 40
    )

    if explicit:
        focal = _field(int(explicit.group(1)), "matched", explicit.group(0))
    else:
        focal = _field(default_mm, "derived", f"from shot size {size_name}")

    shallow = bool(re.search(r"\b(shallow|bokeh|blurred background|defocus)\b", text))
    deep = bool(re.search(r"\b(deep focus|everything in focus|sharp throughout)\b", text))
    if shallow:
        aperture = _field("f/1.8", "matched", "shallow depth of field")
    elif deep:
        aperture = _field("f/11", "matched", "deep focus")
    else:
        # Tighter framing conventionally runs wider open.
        aperture = _field(
            "f/2.8" if focal["value"] >= 85 else "f/5.6",
            "derived",
            f"from focal length {focal['value']}mm",
        )

    return {
        "focal_length_mm": focal,
        "aperture": aperture,
        "depth_of_field": _field(
            "shallow" if shallow or focal["value"] >= 85 else
            "deep" if deep else "moderate",
            "derived",
            "from focal length and focus cues",
        ),
    }


def _extract_action(text: str) -> dict[str, Any]:
    found = [v for v in ACTION_VERBS if re.search(rf"\b{v}\b", text)]
    if found:
        return _field(list(dict.fromkeys(found)), "matched", ", ".join(found))
    return _field([], "default")


def _extract_emotional_beat(text: str) -> dict[str, Any]:
    hits = [(w, EMOTIONAL_BEATS[w]) for w in EMOTIONAL_BEATS if re.search(rf"\b{w}\b", text)]
    if not hits:
        return {
            "beat": _field("neutral", "default"),
            "valence": _field(0.0, "default"),
            "arousal": _field(0.3, "default"),
        }
    # Average when a prompt carries more than one; the strongest arousal names it.
    valence = round(sum(v for _, (v, _a) in hits) / len(hits), 3)
    arousal = round(sum(a for _, (_v, a) in hits) / len(hits), 3)
    dominant = max(hits, key=lambda h: h[1][1])[0]
    return {
        "beat": _field(dominant, "matched", ", ".join(w for w, _ in hits)),
        "valence": _field(valence, "derived", "mean of matched beats"),
        "arousal": _field(arousal, "derived", "mean of matched beats"),
    }


def _extract_dialogue(text: str, original: str) -> dict[str, Any]:
    quoted = re.findall(r"[\"“]([^\"”]+)[\"”]", original)
    if quoted:
        words = sum(len(q.split()) for q in quoted)
        return {
            "lines": _field(quoted, "matched", f"{len(quoted)} quoted line(s)"),
            "word_count": _field(words, "derived", "from quoted text"),
            "has_dialogue": _field(True, "matched"),
        }
    speaks = bool(re.search(r"\b(says|said|speaks|whispers|shouts|asks|replies)\b", text))
    return {
        "lines": _field([], "default"),
        "word_count": _field(0, "default"),
        "has_dialogue": _field(
            speaks, "matched" if speaks else "default",
            "speech verb without quoted text" if speaks else None,
        ),
    }


def _derive_timing(
    action: dict[str, Any], dialogue: dict[str, Any], camera: dict[str, Any], text: str
) -> dict[str, Any]:
    """Estimate duration from dialogue length, movement and action count."""
    explicit = re.search(r"\b(\d+(?:\.\d+)?)\s?(?:s|sec|seconds)\b", text)
    if explicit:
        seconds = _clamp_duration(float(explicit.group(1)))
        return {
            "duration_s": _field(seconds, "matched", explicit.group(0)),
            "pacing": _field(_pacing_for(seconds), "derived", "from duration"),
        }

    seconds = 2.0
    basis = ["2.0s base"]
    words = dialogue["word_count"]["value"]
    if words:
        spoken = words / _SPEAKING_RATE_WPS
        seconds = max(seconds, spoken + 1.0)
        basis.append(f"{words} words at {_SPEAKING_RATE_WPS}/s")
    if action["value"]:
        seconds += 0.8 * len(action["value"])
        basis.append(f"{len(action['value'])} action(s)")
    if camera["movement"]["value"] not in ("static",):
        seconds += 1.5
        basis.append(f"camera {camera['movement']['value']}")
    if camera["shot_size"]["value"] in ("establishing", "extreme_wide", "aerial"):
        seconds += 1.5
        basis.append("wide framing holds longer")

    seconds = _clamp_duration(seconds)
    return {
        "duration_s": _field(seconds, "derived", " + ".join(basis)),
        "pacing": _field(_pacing_for(seconds), "derived", "from duration"),
    }


def _derive_lighting(environment: dict[str, Any], beat: dict[str, Any]) -> dict[str, Any]:
    """Lighting follows from time of day, interior/exterior and the beat."""
    tod = environment["time_of_day"]["value"]
    entry = TIMES_OF_DAY.get(tod)
    if entry:
        _canon, kelvin, elevation = entry
        temp = _field(kelvin, "derived", f"from time of day {tod}")
        key_elev = _field(elevation, "derived", f"from time of day {tod}")
    else:
        temp = _field(5200, "default")
        key_elev = _field(40, "default")

    setting = environment["setting"]["value"]
    if setting == "interior":
        motivation = _field("practical", "derived", "interior setting")
    elif setting == "exterior":
        motivation = _field(
            "sun" if tod not in ("night", "dusk") else "ambient+practical",
            "derived",
            f"exterior, {tod}",
        )
    else:
        motivation = _field("key+fill", "default")

    # Low valence and high arousal conventionally read as higher contrast.
    valence = beat["valence"]["value"]
    arousal = beat["arousal"]["value"]
    ratio = round(2.0 + (arousal * 4.0) + (max(0.0, -valence) * 3.0), 2)

    return {
        "colour_temperature_k": temp,
        "key_elevation_deg": key_elev,
        "key_to_fill_ratio": _field(
            ratio, "derived", "from emotional valence and arousal"
        ),
        "motivation": motivation,
        "mood": _field(
            "high_contrast" if ratio >= 5.0 else "soft",
            "derived",
            f"from key-to-fill ratio {ratio}",
        ),
    }


def _extract_continuity(text: str, previous_shot_id: str | None) -> dict[str, Any]:
    cues = [c for c in CONTINUITY_CUES if c in text]
    depends = bool(cues) or previous_shot_id is not None
    return {
        "depends_on_previous": _field(
            depends,
            "matched" if cues else ("derived" if previous_shot_id else "default"),
            ", ".join(cues) or (f"previous_shot_id={previous_shot_id}" if previous_shot_id else None),
        ),
        "previous_shot_id": _field(
            previous_shot_id, "matched" if previous_shot_id else "default"
        ),
        "cues": _field(cues, "matched" if cues else "default"),
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def decompose_prompt(
    prompt: str,
    *,
    previous_shot_id: str | None = None,
    shot_id: str | None = None,
) -> dict[str, Any]:
    """Decompose *prompt* into the ten structured fields E3 specifies.

    Deterministic: the same prompt always yields the same decomposition, and
    ``shot_id`` is derived from the prompt when not supplied so a scene can be
    recomputed without storing ids.
    """
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("prompt must be a non-empty string")

    original = prompt.strip()
    text = original.lower()
    sid = shot_id or "shot_" + hashlib.sha256(original.encode()).hexdigest()[:10]

    subject = _extract_subjects(text, original)
    environment = _extract_environment(text)
    camera = _extract_camera(text)
    lens = _derive_lens(camera, text)
    action = _extract_action(text)
    beat = _extract_emotional_beat(text)
    dialogue = _extract_dialogue(text, original)
    timing = _derive_timing(action, dialogue, camera, text)
    lighting = _derive_lighting(environment, beat)
    continuity = _extract_continuity(text, previous_shot_id)

    decomposition = {
        "shot_id": sid,
        "prompt": original,
        "subject": subject,
        "environment": environment,
        "camera": camera,
        "lens": lens,
        "action": action,
        "emotional_beat": beat,
        "timing": timing,
        "dialogue_cue": dialogue,
        "lighting_state": lighting,
        "continuity_dependency": continuity,
    }
    decomposition["coverage"] = _coverage(decomposition)
    return decomposition


def to_scene_graph(decomposition: dict[str, Any]) -> dict[str, Any]:
    """Render a decomposition into the shape ``parse_scene_graph`` accepts.

    Subjects become character elements spread across the x axis, the camera
    becomes a camera element placed back along -z by a distance that follows
    from focal length, and the key light becomes a light element positioned
    from its elevation.
    """
    elements: list[dict[str, Any]] = []

    subjects = decomposition["subject"]["value"]
    spread = 1.4
    start = -spread * (len(subjects) - 1) / 2
    for i, subj in enumerate(subjects):
        elements.append({
            "id": subj["id"],
            "type": "character",
            "position": {"x": round(start + i * spread, 3), "y": 0.0, "z": 0.0},
            "properties": {
                "label": subj["label"],
                "actions": decomposition["action"]["value"],
                "emotional_beat": decomposition["emotional_beat"]["beat"]["value"],
            },
        })

    focal = decomposition["lens"]["focal_length_mm"]["value"]
    # Longer lens, further back for equivalent framing. 40mm ~ 4m is a
    # workable reference for a waist-up medium shot.
    distance = round(4.0 * (focal / 40.0), 3)
    elements.append({
        "id": "camera_main",
        "type": "camera",
        "position": {"x": 0.0, "y": 1.6, "z": -distance},
        "properties": {
            "focal_length_mm": focal,
            "aperture": decomposition["lens"]["aperture"]["value"],
            "shot_size": decomposition["camera"]["shot_size"]["value"],
            "angle": decomposition["camera"]["angle"]["value"],
            "movement": decomposition["camera"]["movement"]["value"],
        },
    })

    lighting = decomposition["lighting_state"]
    elevation = lighting["key_elevation_deg"]["value"]
    elements.append({
        "id": "key_light",
        "type": "light",
        "position": {"x": 2.0, "y": round(2.0 + elevation / 20.0, 3), "z": -1.5},
        "properties": {
            "colour_temperature_k": lighting["colour_temperature_k"]["value"],
            "key_to_fill_ratio": lighting["key_to_fill_ratio"]["value"],
            "motivation": lighting["motivation"]["value"],
        },
    })

    return {
        "elements": elements,
        "metadata": {
            "shot_id": decomposition["shot_id"],
            "source_prompt": decomposition["prompt"],
            "duration_s": decomposition["timing"]["duration_s"]["value"],
            "setting": decomposition["environment"]["setting"]["value"],
            "time_of_day": decomposition["environment"]["time_of_day"]["value"],
            "depends_on_previous": (
                decomposition["continuity_dependency"]["depends_on_previous"]["value"]
            ),
            "coverage": decomposition["coverage"],
        },
    }


def decompose_sequence(prompts: list[str]) -> dict[str, Any]:
    """Decompose an ordered list of prompts, chaining continuity between them."""
    if not isinstance(prompts, list) or not prompts:
        raise ValueError("prompts must be a non-empty list")

    shots: list[dict[str, Any]] = []
    previous: str | None = None
    for prompt in prompts:
        shot = decompose_prompt(prompt, previous_shot_id=previous)
        shots.append(shot)
        previous = shot["shot_id"]

    total = round(sum(s["timing"]["duration_s"]["value"] for s in shots), 2)
    return {
        "shots": shots,
        "shot_count": len(shots),
        "total_duration_s": total,
        "mean_coverage": round(
            sum(s["coverage"]["ratio"] for s in shots) / len(shots), 3
        ),
    }


# ── Internals ────────────────────────────────────────────────────────────────


def _coverage(decomposition: dict[str, Any]) -> dict[str, Any]:
    """How much of the decomposition the prompt actually spoke to.

    Counts leaf fields whose source is ``matched``. A low ratio means most of
    the scene is convention rather than direction -- worth surfacing before
    anything spends render time on it.
    """
    matched = 0
    total = 0
    defaulted: list[str] = []

    def walk(node: Any, path: str) -> None:
        nonlocal matched, total
        if isinstance(node, dict) and "source" in node and "value" in node:
            total += 1
            if node["source"] == "matched":
                matched += 1
            elif node["source"] == "default":
                defaulted.append(path)
            return
        if isinstance(node, dict):
            for key, val in node.items():
                walk(val, f"{path}.{key}" if path else key)

    for key in (
        "subject", "environment", "camera", "lens", "action",
        "emotional_beat", "timing", "dialogue_cue", "lighting_state",
        "continuity_dependency",
    ):
        walk(decomposition[key], key)

    return {
        "matched_fields": matched,
        "total_fields": total,
        "ratio": round(matched / total, 3) if total else 0.0,
        "defaulted_fields": defaulted,
    }


def _clamp_duration(seconds: float) -> float:
    return round(max(_MIN_DURATION_S, min(_MAX_DURATION_S, seconds)), 2)


def _pacing_for(seconds: float) -> str:
    if seconds <= 2.5:
        return "fast"
    if seconds <= 6.0:
        return "moderate"
    return "slow"


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_") or "subject"
