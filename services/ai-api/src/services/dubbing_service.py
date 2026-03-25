"""Service layer for AI dubbing and localization pipeline."""

from __future__ import annotations

import uuid
from typing import Any


# ── Constants ────────────────────────────────────────────────────────────────

SUPPORTED_LANGUAGES: list[dict[str, Any]] = [
    {"code": "en", "name": "English", "tts_available": True, "translation_quality": "high"},
    {"code": "es", "name": "Spanish", "tts_available": True, "translation_quality": "high"},
    {"code": "fr", "name": "French", "tts_available": True, "translation_quality": "high"},
    {"code": "de", "name": "German", "tts_available": True, "translation_quality": "high"},
    {"code": "ja", "name": "Japanese", "tts_available": True, "translation_quality": "high"},
    {"code": "ko", "name": "Korean", "tts_available": True, "translation_quality": "high"},
    {"code": "zh", "name": "Chinese", "tts_available": True, "translation_quality": "high"},
    {"code": "pt", "name": "Portuguese", "tts_available": True, "translation_quality": "high"},
    {"code": "it", "name": "Italian", "tts_available": True, "translation_quality": "high"},
    {"code": "ru", "name": "Russian", "tts_available": True, "translation_quality": "high"},
    {"code": "ar", "name": "Arabic", "tts_available": True, "translation_quality": "medium"},
    {"code": "hi", "name": "Hindi", "tts_available": True, "translation_quality": "medium"},
    {"code": "tr", "name": "Turkish", "tts_available": True, "translation_quality": "medium"},
    {"code": "pl", "name": "Polish", "tts_available": True, "translation_quality": "medium"},
    {"code": "nl", "name": "Dutch", "tts_available": True, "translation_quality": "medium"},
    {"code": "sv", "name": "Swedish", "tts_available": True, "translation_quality": "medium"},
    {"code": "th", "name": "Thai", "tts_available": True, "translation_quality": "medium"},
    {"code": "vi", "name": "Vietnamese", "tts_available": True, "translation_quality": "medium"},
    {"code": "id", "name": "Indonesian", "tts_available": True, "translation_quality": "medium"},
    {"code": "uk", "name": "Ukrainian", "tts_available": False, "translation_quality": "medium"},
    {"code": "cs", "name": "Czech", "tts_available": False, "translation_quality": "medium"},
    {"code": "ro", "name": "Romanian", "tts_available": False, "translation_quality": "low"},
]

_LANG_CODES: set[str] = {lang["code"] for lang in SUPPORTED_LANGUAGES}

# Simple heuristic character-frequency maps for language detection
_LANG_MARKERS: list[tuple[str, str]] = [
    ("ja", "\u3041\u3042\u3043\u3044\u3045\u3046\u3047\u3048\u3049\u304a\u304b\u304c\u304d\u304e\u304f\u3050\u3051\u3052\u3053\u3054\u306b\u306f\u3093\u3061\u30a0\u30a1\u30a2\u30a3\u30a4\u30a5"),
    ("ko", "\uac00\uac01\uac02\ub098\ub2e4\ub77c\ub9c8\ubc14"),
    ("zh", "\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u7684\u662f"),
    ("ar", "\u0627\u0628\u062a\u062b\u062c\u062d\u062e\u0639\u0641"),
    ("ru", "\u0430\u0431\u0432\u0433\u0434\u0435\u0436\u0437\u0438"),
    ("hi", "\u0905\u0906\u0907\u0908\u0909\u0915\u0916\u0917"),
    ("th", "\u0e01\u0e02\u0e03\u0e04\u0e05\u0e06\u0e07"),
    ("uk", "\u0456\u0457\u0454\u0491"),
]


# ── Public API ───────────────────────────────────────────────────────────────


def translate_script(
    script: str, source_lang: str, target_lang: str
) -> dict[str, Any]:
    """Simulate translating a script from *source_lang* to *target_lang*.

    Returns translated script text, word count, and confidence score.
    """
    _validate_language(source_lang)
    _validate_language(target_lang)

    word_count = len(script.split())
    confidence = _translation_confidence(source_lang, target_lang)
    translated = f"[{target_lang}] {script}"

    return {
        "translated_script": translated,
        "word_count": word_count,
        "confidence": confidence,
    }


def generate_dubbed_audio(
    dialogue: str,
    target_lang: str,
    voice_id: str,
    preserve_emotion: bool = True,
) -> dict[str, Any]:
    """Simulate TTS generation in the target language.

    Returns a job ID, audio URL, and estimated duration in milliseconds.
    """
    _validate_language(target_lang)

    job_id = _new_job_id("dub")
    word_count = max(len(dialogue.split()), 1)
    duration_ms = word_count * 400  # ~150 wpm heuristic

    return {
        "job_id": job_id,
        "audio_url": f"https://cdn.animaforge.ai/dubs/{job_id}.wav",
        "duration_ms": duration_ms,
    }


def lip_sync_adjust(
    video_url: str, new_audio_url: str, target_lang: str
) -> dict[str, Any]:
    """Adjust lip sync for dubbed audio against the source video.

    Returns a job ID, synced video URL, and a sync-quality score (0-1).
    """
    _validate_language(target_lang)

    job_id = _new_job_id("sync")
    sync_quality = 0.92 if target_lang in {"es", "fr", "pt", "it"} else 0.85

    return {
        "job_id": job_id,
        "synced_video_url": f"https://cdn.animaforge.ai/synced/{job_id}.mp4",
        "sync_quality": sync_quality,
    }


def batch_dub_project(
    project_id: str, target_langs: list[str]
) -> dict[str, Any]:
    """Dub an entire project into multiple languages.

    Returns a list of per-language job descriptors with status and progress.
    """
    jobs: list[dict[str, Any]] = []
    for lang in target_langs:
        _validate_language(lang)
        jobs.append(
            {
                "lang": lang,
                "status": "queued",
                "progress": 0,
                "job_id": _new_job_id("batch"),
            }
        )

    return {"project_id": project_id, "jobs": jobs}


def get_supported_languages() -> list[dict[str, Any]]:
    """Return the full catalogue of supported languages."""
    return list(SUPPORTED_LANGUAGES)


def detect_language(text: str) -> dict[str, Any]:
    """Auto-detect the language of the given *text* using simple heuristics.

    Returns a language code, name, and confidence score.
    """
    if not text.strip():
        return {"code": "unknown", "name": "Unknown", "confidence": 0.0}

    for code, chars in _LANG_MARKERS:
        if any(ch in text for ch in chars):
            name = next(
                (l["name"] for l in SUPPORTED_LANGUAGES if l["code"] == code),
                code,
            )
            return {"code": code, "name": name, "confidence": 0.90}

    # Default to English for Latin-script text
    return {"code": "en", "name": "English", "confidence": 0.75}


def preserve_timing(
    original_audio_url: str, dubbed_audio_url: str
) -> dict[str, Any]:
    """Match timing / pacing of dubbed audio to the original.

    Returns the adjusted audio URL and a timing-accuracy score (0-1).
    """
    job_id = _new_job_id("timing")
    return {
        "adjusted_audio_url": f"https://cdn.animaforge.ai/timed/{job_id}.wav",
        "timing_accuracy": 0.94,
    }


# ── Helpers ──────────────────────────────────────────────────────────────────


def _new_job_id(prefix: str = "dub") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def _validate_language(code: str) -> None:
    """Raise ``ValueError`` if *code* is not a supported language."""
    if code not in _LANG_CODES:
        raise ValueError(f"Unsupported language code: {code!r}")


def _translation_confidence(source: str, target: str) -> float:
    """Return a simulated confidence score based on language pair quality."""
    src_q = next(
        (l["translation_quality"] for l in SUPPORTED_LANGUAGES if l["code"] == source),
        "low",
    )
    tgt_q = next(
        (l["translation_quality"] for l in SUPPORTED_LANGUAGES if l["code"] == target),
        "low",
    )
    quality_map = {"high": 1.0, "medium": 0.7, "low": 0.5}
    return round((quality_map.get(src_q, 0.5) + quality_map.get(tgt_q, 0.5)) / 2, 2)
