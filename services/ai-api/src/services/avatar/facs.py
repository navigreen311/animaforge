"""X5 Subsystem 3 — FACS action units driving blendshape weights.

Implements the Facial Action Coding System (Ekman & Friesen) as an actual
solver rather than a lookup table:

* :data:`ACTION_UNITS` catalogues the action units the rig supports, each with
  the ARKit blendshape targets it drives and the gain it applies to them.
* FACS intensity letters ``A``-``E`` map onto the numeric range via
  :data:`INTENSITY_SCALE`.
* :func:`solve_blendshapes` accumulates every active AU onto the 52 ARKit
  targets, then resolves *antagonist* pairs — muscles that physically oppose
  one another, such as AU6 (cheek raiser) narrowing the eye against AU5 (upper
  lid raiser) widening it — by net difference rather than by letting both fire.
* Mouth aperture (AU25 / AU26 / AU27) is mutually exclusive: the largest
  aperture wins, because a jaw cannot be simultaneously parted and stretched.

Emotion prototypes in :data:`EMOTION_PROTOTYPES` are the classic Ekman AU
combinations, so ``happiness`` really is AU6 + AU12 rather than a hand-tuned
slider set.
"""

from __future__ import annotations

from dataclasses import dataclass

#: FACS intensity letters A (trace) through E (maximum).
INTENSITY_SCALE: dict[str, float] = {
    "A": 0.2,
    "B": 0.4,
    "C": 0.6,
    "D": 0.8,
    "E": 1.0,
}

#: The 52 ARKit blendshape targets, in Apple's canonical order.
ARKIT_BLENDSHAPES: tuple[str, ...] = (
    "eyeBlinkLeft", "eyeLookDownLeft", "eyeLookInLeft", "eyeLookOutLeft",
    "eyeLookUpLeft", "eyeSquintLeft", "eyeWideLeft",
    "eyeBlinkRight", "eyeLookDownRight", "eyeLookInRight", "eyeLookOutRight",
    "eyeLookUpRight", "eyeSquintRight", "eyeWideRight",
    "jawForward", "jawLeft", "jawRight", "jawOpen",
    "mouthClose", "mouthFunnel", "mouthPucker", "mouthLeft", "mouthRight",
    "mouthSmileLeft", "mouthSmileRight", "mouthFrownLeft", "mouthFrownRight",
    "mouthDimpleLeft", "mouthDimpleRight", "mouthStretchLeft",
    "mouthStretchRight", "mouthRollLower", "mouthRollUpper",
    "mouthShrugLower", "mouthShrugUpper", "mouthPressLeft", "mouthPressRight",
    "mouthLowerDownLeft", "mouthLowerDownRight", "mouthUpperUpLeft",
    "mouthUpperUpRight",
    "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft",
    "browOuterUpRight",
    "cheekPuff", "cheekSquintLeft", "cheekSquintRight",
    "noseSneerLeft", "noseSneerRight",
    "tongueOut",
)


@dataclass(frozen=True)
class ActionUnit:
    """One FACS action unit and the blendshape targets it drives."""

    number: int
    name: str
    muscle: str
    targets: dict[str, float]
    bilateral: bool = True


#: Action units this rig implements, keyed by AU number.
ACTION_UNITS: dict[int, ActionUnit] = {
    1: ActionUnit(1, "Inner Brow Raiser", "frontalis, pars medialis",
                  {"browInnerUp": 1.0}, bilateral=False),
    2: ActionUnit(2, "Outer Brow Raiser", "frontalis, pars lateralis",
                  {"browOuterUpLeft": 1.0, "browOuterUpRight": 1.0}),
    4: ActionUnit(4, "Brow Lowerer", "corrugator supercilii, depressor supercilii",
                  {"browDownLeft": 1.0, "browDownRight": 1.0}),
    5: ActionUnit(5, "Upper Lid Raiser", "levator palpebrae superioris",
                  {"eyeWideLeft": 1.0, "eyeWideRight": 1.0}),
    6: ActionUnit(6, "Cheek Raiser", "orbicularis oculi, pars orbitalis",
                  {"cheekSquintLeft": 1.0, "cheekSquintRight": 1.0,
                   "eyeSquintLeft": 0.7, "eyeSquintRight": 0.7}),
    7: ActionUnit(7, "Lid Tightener", "orbicularis oculi, pars palpebralis",
                  {"eyeSquintLeft": 1.0, "eyeSquintRight": 1.0}),
    9: ActionUnit(9, "Nose Wrinkler", "levator labii superioris alaeque nasi",
                  {"noseSneerLeft": 1.0, "noseSneerRight": 1.0,
                   "mouthUpperUpLeft": 0.3, "mouthUpperUpRight": 0.3}),
    10: ActionUnit(10, "Upper Lip Raiser", "levator labii superioris",
                   {"mouthUpperUpLeft": 1.0, "mouthUpperUpRight": 1.0,
                    "mouthShrugUpper": 0.4}),
    12: ActionUnit(12, "Lip Corner Puller", "zygomaticus major",
                   {"mouthSmileLeft": 1.0, "mouthSmileRight": 1.0}),
    14: ActionUnit(14, "Dimpler", "buccinator",
                   {"mouthDimpleLeft": 1.0, "mouthDimpleRight": 1.0}),
    15: ActionUnit(15, "Lip Corner Depressor", "depressor anguli oris",
                   {"mouthFrownLeft": 1.0, "mouthFrownRight": 1.0}),
    17: ActionUnit(17, "Chin Raiser", "mentalis",
                   {"mouthShrugLower": 1.0}, bilateral=False),
    18: ActionUnit(18, "Lip Puckerer", "incisivii labii",
                   {"mouthPucker": 1.0}, bilateral=False),
    20: ActionUnit(20, "Lip Stretcher", "risorius, platysma",
                   {"mouthStretchLeft": 1.0, "mouthStretchRight": 1.0}),
    22: ActionUnit(22, "Lip Funneler", "orbicularis oris",
                   {"mouthFunnel": 1.0}, bilateral=False),
    23: ActionUnit(23, "Lip Tightener", "orbicularis oris",
                   {"mouthPressLeft": 1.0, "mouthPressRight": 1.0}),
    24: ActionUnit(24, "Lip Pressor", "orbicularis oris",
                   {"mouthPressLeft": 0.8, "mouthPressRight": 0.8,
                    "mouthRollLower": 0.5, "mouthRollUpper": 0.5}),
    25: ActionUnit(25, "Lips Part", "depressor labii, relaxed mentalis",
                   {"jawOpen": 0.25}, bilateral=False),
    26: ActionUnit(26, "Jaw Drop", "masseter, temporalis relaxed",
                   {"jawOpen": 0.6}, bilateral=False),
    27: ActionUnit(27, "Mouth Stretch", "pterygoids, digastric",
                   {"jawOpen": 1.0, "mouthStretchLeft": 0.4,
                    "mouthStretchRight": 0.4}, bilateral=False),
    28: ActionUnit(28, "Lip Suck", "orbicularis oris",
                   {"mouthRollLower": 1.0, "mouthRollUpper": 1.0},
                   bilateral=False),
    34: ActionUnit(34, "Cheek Puff", "buccinator",
                   {"cheekPuff": 1.0}, bilateral=False),
    36: ActionUnit(36, "Tongue Show", "genioglossus",
                   {"tongueOut": 1.0}, bilateral=False),
    43: ActionUnit(43, "Eyes Closed", "relaxation of levator palpebrae",
                   {"eyeBlinkLeft": 1.0, "eyeBlinkRight": 1.0}),
    45: ActionUnit(45, "Blink", "orbicularis oculi, pars palpebralis",
                   {"eyeBlinkLeft": 1.0, "eyeBlinkRight": 1.0}),
    51: ActionUnit(51, "Head Turn Left", "sternocleidomastoid",
                   {"jawLeft": 0.2}, bilateral=False),
    52: ActionUnit(52, "Head Turn Right", "sternocleidomastoid",
                   {"jawRight": 0.2}, bilateral=False),
}

#: Blendshape targets that physically oppose one another.
ANTAGONISTS: tuple[tuple[str, str], ...] = (
    ("eyeWideLeft", "eyeSquintLeft"),
    ("eyeWideRight", "eyeSquintRight"),
    ("eyeWideLeft", "eyeBlinkLeft"),
    ("eyeWideRight", "eyeBlinkRight"),
    ("mouthSmileLeft", "mouthFrownLeft"),
    ("mouthSmileRight", "mouthFrownRight"),
    ("browInnerUp", "browDownLeft"),
    ("browInnerUp", "browDownRight"),
    ("browOuterUpLeft", "browDownLeft"),
    ("browOuterUpRight", "browDownRight"),
    ("mouthPucker", "mouthStretchLeft"),
    ("mouthPucker", "mouthStretchRight"),
    ("jawOpen", "mouthClose"),
)

#: AUs whose mouth aperture is mutually exclusive; the widest one wins.
_APERTURE_AUS = (25, 26, 27)

#: Ekman's prototypical AU combinations for the six basic emotions.
EMOTION_PROTOTYPES: dict[str, dict[int, float]] = {
    "neutral": {},
    "happiness": {6: 0.8, 12: 1.0},
    "sadness": {1: 0.7, 4: 0.5, 15: 0.8},
    "surprise": {1: 0.9, 2: 0.9, 5: 0.8, 26: 0.7},
    "fear": {1: 0.8, 2: 0.6, 4: 0.6, 5: 0.9, 20: 0.7, 26: 0.5},
    "anger": {4: 1.0, 5: 0.6, 7: 0.8, 23: 0.8},
    "disgust": {9: 1.0, 15: 0.6, 17: 0.5},
    "contempt": {12: 0.5, 14: 0.8},
}


def normalise_intensity(value: float | str) -> float:
    """Convert a FACS letter or a number into a weight in [0, 1]."""
    if isinstance(value, str):
        letter = value.strip().upper()
        if letter not in INTENSITY_SCALE:
            raise ValueError(
                f"FACS intensity must be one of {sorted(INTENSITY_SCALE)}, "
                f"got {value!r}"
            )
        return INTENSITY_SCALE[letter]
    if not 0.0 <= float(value) <= 1.0:
        raise ValueError(f"AU intensity must be within [0, 1], got {value}")
    return float(value)


def solve_blendshapes(
    activations: dict[int, float | str],
    *,
    include_zeros: bool = False,
) -> dict[str, float]:
    """Solve AU activations into ARKit blendshape weights.

    Args:
        activations: AU number to intensity (0-1, or a FACS letter A-E).
        include_zeros: Emit all 52 targets rather than only the active ones.

    Raises:
        ValueError: on an unknown AU number or an out-of-range intensity.
    """
    unknown = sorted(set(activations) - set(ACTION_UNITS))
    if unknown:
        raise ValueError(f"Unsupported action units: {unknown}")

    resolved = {au: normalise_intensity(v) for au, v in activations.items()}
    resolved = _resolve_aperture(resolved)

    weights: dict[str, float] = {name: 0.0 for name in ARKIT_BLENDSHAPES}
    for au_number, intensity in resolved.items():
        if intensity <= 0.0:
            continue
        for target, gain in ACTION_UNITS[au_number].targets.items():
            weights[target] += intensity * gain

    weights = _resolve_antagonists(weights)
    weights = {name: min(1.0, max(0.0, value)) for name, value in weights.items()}

    if include_zeros:
        return {name: round(weights[name], 6) for name in ARKIT_BLENDSHAPES}
    return {
        name: round(value, 6)
        for name, value in weights.items()
        if value > 0.0
    }


def blendshapes_for_emotion(
    emotion: str,
    intensity: float = 1.0,
) -> dict[str, float]:
    """Solve the prototypical AU combination for a named emotion."""
    key = emotion.strip().lower()
    if key not in EMOTION_PROTOTYPES:
        raise ValueError(
            f"Unknown emotion {emotion!r}; expected one of "
            f"{sorted(EMOTION_PROTOTYPES)}"
        )
    if not 0.0 <= intensity <= 1.0:
        raise ValueError(f"intensity must be within [0, 1], got {intensity}")

    scaled = {
        au: weight * intensity
        for au, weight in EMOTION_PROTOTYPES[key].items()
    }
    return solve_blendshapes(scaled)


def build_facs_rig(character_id: str, engine: str) -> dict[str, object]:
    """Build the serialisable FACS rig for a character.

    Contains the AU catalogue, the neutral pose and a solved blendshape set for
    every emotion prototype, which is what the runtime loads to drive a face.
    """
    return {
        "schema": "animaforge.facs-rig/1",
        "character_id": character_id,
        "engine": engine,
        "blendshape_targets": list(ARKIT_BLENDSHAPES),
        "intensity_scale": INTENSITY_SCALE,
        "action_units": [
            {
                "au": unit.number,
                "name": unit.name,
                "muscle": unit.muscle,
                "bilateral": unit.bilateral,
                "targets": unit.targets,
            }
            for unit in sorted(ACTION_UNITS.values(), key=lambda u: u.number)
        ],
        "antagonists": [list(pair) for pair in ANTAGONISTS],
        "expressions": {
            emotion: {
                "action_units": prototype,
                "blendshapes": blendshapes_for_emotion(emotion),
            }
            for emotion, prototype in EMOTION_PROTOTYPES.items()
        },
    }


# ── Internals ────────────────────────────────────────────────────────────────


def _resolve_aperture(activations: dict[int, float]) -> dict[int, float]:
    """Keep only the widest mouth-aperture AU; a jaw has one position."""
    present = {au: activations[au] for au in _APERTURE_AUS if au in activations}
    if len(present) <= 1:
        return activations

    widest = max(present, key=lambda au: (ACTION_UNITS[au].targets["jawOpen"],
                                          present[au]))
    return {
        au: value
        for au, value in activations.items()
        if au not in _APERTURE_AUS or au == widest
    }


def _opposing_targets() -> dict[str, set[str]]:
    """Build the symmetric adjacency map of opposing blendshape targets."""
    adjacency: dict[str, set[str]] = {}
    for first, second in ANTAGONISTS:
        adjacency.setdefault(first, set()).add(second)
        adjacency.setdefault(second, set()).add(first)
    return adjacency


_OPPOSING = _opposing_targets()


def _resolve_antagonists(weights: dict[str, float]) -> dict[str, float]:
    """Subtract each target's opposing drive from it, exactly once.

    Resolution reads from the *pre-resolution* weights throughout. A target
    can oppose several others — ``browInnerUp`` is opposed by both
    ``browDownLeft`` and ``browDownRight`` — and resolving pair by pair
    against progressively mutated values would subtract that opposition twice,
    zeroing a brow raise that should survive at its net strength. The opposing
    drive is therefore the strongest single antagonist, not their sum.
    """
    resolved = dict(weights)
    for target, opponents in _OPPOSING.items():
        own = weights.get(target, 0.0)
        if own <= 0.0:
            continue
        opposing = max((weights.get(name, 0.0) for name in opponents), default=0.0)
        resolved[target] = max(0.0, own - opposing)
    return resolved
