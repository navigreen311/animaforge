"""AI music composition routes — scene analysis, stem generation, beat sync, SFX."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..services.music_service import (
    adjust_timing,
    analyze_scene_for_music,
    detect_beat_grid,
    generate_score,
    generate_sound_effects,
    generate_stems,
    mix_stems,
    sync_to_beats,
)

router = APIRouter(prefix="/ai/v1")


# ── Request Schemas ──────────────────────────────────────────────────────────


class GenerateScoreRequest(BaseModel):
    project_id: str = Field(..., description="Project identifier")
    scene_analysis: dict[str, Any] = Field(
        ..., description="Scene analysis data (intensity_curve, etc.)"
    )
    mood: str = Field(..., description="Target mood (e.g. 'tense', 'happy')")
    duration_ms: int = Field(..., gt=0, description="Desired score duration in ms")
    genre: str | None = Field(None, description="Optional genre hint")


class AnalyzeSceneRequest(BaseModel):
    scene_graphs: list[dict[str, Any]] = Field(
        ..., min_length=1, description="Scene graph data for each scene"
    )


class GenerateStemsRequest(BaseModel):
    job_id: str = Field(..., description="Music composition job ID")
    stem_types: list[str] = Field(
        ..., min_length=1, description="Stem types to generate"
    )


class MixStemsRequest(BaseModel):
    stems: list[dict[str, Any]] = Field(
        ..., min_length=1, description="Stems to mix"
    )
    mix_params: dict[str, Any] = Field(
        default_factory=dict, description="Per-stem volume/pan/effects"
    )


class GenerateSFXRequest(BaseModel):
    scene_desc: str = Field(..., description="Scene description for SFX inference")
    timestamps: list[int] = Field(
        ..., min_length=1, description="Timestamps (ms) where SFX should occur"
    )


class AdjustTimingRequest(BaseModel):
    music_url: str = Field(..., description="URL of the music file to re-time")
    cut_points: list[int] = Field(
        ..., min_length=1, description="Video cut points in ms"
    )


class DetectBeatsRequest(BaseModel):
    audio_url: str = Field(..., min_length=1, description="URL of the audio to analyse")


class SyncToBeatsRequest(BaseModel):
    video_url: str = Field(..., min_length=1, description="URL of the video")
    audio_url: str = Field(..., min_length=1, description="URL of the audio")


# ── Routes ───────────────────────────────────────────────────────────────────


@router.post("/music/score")
async def route_generate_score(body: GenerateScoreRequest) -> dict[str, Any]:
    """Generate a full musical score for a project scene."""
    return generate_score(
        project_id=body.project_id,
        scene_analysis=body.scene_analysis,
        mood=body.mood,
        duration_ms=body.duration_ms,
        genre=body.genre,
    )


@router.post("/music/analyze-scene")
async def route_analyze_scene(body: AnalyzeSceneRequest) -> dict[str, Any]:
    """Analyse scene graphs to extract musical cues."""
    return analyze_scene_for_music(body.scene_graphs)


@router.post("/music/stems")
async def route_generate_stems(body: GenerateStemsRequest) -> dict[str, Any]:
    """Generate individual instrument stems."""
    return generate_stems(job_id=body.job_id, stem_types=body.stem_types)


@router.post("/music/mix")
async def route_mix_stems(body: MixStemsRequest) -> dict[str, Any]:
    """Mix stems together with volume/pan/effects."""
    return mix_stems(stems=body.stems, mix_params=body.mix_params)


@router.post("/music/sfx")
async def route_generate_sfx(body: GenerateSFXRequest) -> dict[str, Any]:
    """Generate sound effects for specific scene moments."""
    return generate_sound_effects(
        scene_desc=body.scene_desc, timestamps=body.timestamps
    )


@router.post("/music/adjust-timing")
async def route_adjust_timing(body: AdjustTimingRequest) -> dict[str, Any]:
    """Re-time music to match video edit cut points."""
    return adjust_timing(music_url=body.music_url, cut_points=body.cut_points)


@router.post("/music/detect-beats")
async def route_detect_beats(body: DetectBeatsRequest) -> dict[str, Any]:
    """Detect beat grid in an audio file."""
    return detect_beat_grid(audio_url=body.audio_url)


@router.post("/music/sync")
async def route_sync_to_beats(body: SyncToBeatsRequest) -> dict[str, Any]:
    """Synchronise video cuts to detected music beats."""
    return sync_to_beats(video_url=body.video_url, audio_url=body.audio_url)
