"""D3/D6 video: text-to-video and image-to-video through diffusers.

This is the real adapter. It is **gated**, not default: video diffusion needs a
CUDA GPU with real VRAM and several gigabytes of weights, which neither CI nor
a laptop has. What matters is that the code path exists, the dependencies are
declared, and the capabilities endpoint reports the truth — a caller asking for
``VIDEO_ENGINE=real`` on an unprovisioned host gets
:class:`~..engines.EngineUnavailable`, never a synthetic clip labelled real.

Frames are written to storage through the same
:mod:`src.services.avatar.storage` the X5 pipeline uses, so a URL in the
response always refers to bytes that exist.

**Never executed.** There is no GPU in CI and none on the machine this was
written on. It is written against the documented diffusers API. Treat the first
run on a provisioned host as unverified, and see
``docs/generation-pipeline.md`` for what to provision.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from ..engines import EngineUnavailable, probe, upgrade_available

#: Default checkpoint when VIDEO_MODEL_ID is unset. Chosen because it is the
#: smallest widely-available text-to-video checkpoint; anything better is a
#: bigger download, not a code change.
DEFAULT_MODEL_ID = "damo-vilab/text-to-video-ms-1.7b"

#: Frames per second the exported clip is muxed at.
DEFAULT_FPS = 8


@dataclass(frozen=True)
class VideoResult:
    """A clip that was actually generated and written."""

    url: str
    frame_count: int
    fps: int
    width: int
    height: int
    model_id: str
    seed: int
    sha256: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "url": self.url,
            "frame_count": self.frame_count,
            "fps": self.fps,
            "resolution": [self.width, self.height],
            "model_id": self.model_id,
            "seed": self.seed,
            "sha256": self.sha256,
        }


def video_available() -> bool:
    """True when text-to-video can actually run on this host."""
    return upgrade_available("video")


def generate_video(
    prompt: str,
    *,
    job_id: str,
    num_frames: int = 16,
    steps: int = 25,
    seed: int = 0,
    image_path: str | None = None,
) -> VideoResult:
    """Generate a clip and write it to storage.

    Args:
        prompt: Text conditioning.
        job_id: Used to key the stored artifact.
        num_frames: Frames to sample. VRAM scales with this.
        steps: Denoising steps.
        seed: Torch generator seed, so a run is reproducible.
        image_path: Conditioning frame for image-to-video (D6). Text-to-video
            (D3) when omitted.

    Raises:
        EngineUnavailable: if torch/diffusers or the weights are missing.
        ValueError: on an empty prompt or a non-positive frame count.
        FileNotFoundError: if *image_path* is given but absent.
    """
    if not prompt.strip():
        raise ValueError("prompt must not be empty")
    if num_frames < 1:
        raise ValueError(f"num_frames must be >= 1, got {num_frames}")

    status = probe("video")
    if not upgrade_available("video"):
        raise EngineUnavailable(
            "Video diffusion needs the gated video engine. Missing: "
            + ", ".join(status.missing)
        )

    if image_path and not os.path.isfile(image_path):
        raise FileNotFoundError(f"No conditioning image at {image_path}")

    # Imported lazily: video_service imports this module on every request and
    # torch must never become a hard dependency of the CPU path.
    import torch  # type: ignore[import-not-found]

    model_id = os.getenv("VIDEO_MODEL_ID", DEFAULT_MODEL_ID)
    weights_dir = os.getenv("VIDEO_WEIGHTS_DIR") or None
    device = "cuda" if torch.cuda.is_available() else "cpu"

    if device != "cuda":
        # Diffusion on CPU is not "slow", it is unusable -- tens of minutes per
        # clip. Refusing is more honest than appearing to hang.
        raise EngineUnavailable(
            "Video diffusion requires a CUDA device; torch reports none. "
            "See docs/generation-pipeline.md for the VRAM floor."
        )

    frames = (
        _image_to_video(model_id, weights_dir, image_path, num_frames, steps, seed)
        if image_path
        else _text_to_video(model_id, weights_dir, prompt, num_frames, steps, seed)
    )

    payload, width, height = _encode(frames, DEFAULT_FPS)

    from ..avatar.storage import store_artifact

    artifact = store_artifact(f"video/{job_id}/clip.mp4", payload, "video/mp4")

    return VideoResult(
        url=artifact.url,
        frame_count=len(frames),
        fps=DEFAULT_FPS,
        width=width,
        height=height,
        model_id=model_id,
        seed=seed,
        sha256=artifact.sha256,
    )


# ── Internals ────────────────────────────────────────────────────────────────


def _text_to_video(
    model_id: str,
    weights_dir: str | None,
    prompt: str,
    num_frames: int,
    steps: int,
    seed: int,
) -> list[Any]:
    import torch  # type: ignore[import-not-found]
    from diffusers import DiffusionPipeline  # type: ignore[import-not-found]

    pipeline = DiffusionPipeline.from_pretrained(
        model_id, torch_dtype=torch.float16, cache_dir=weights_dir
    )
    pipeline.to("cuda")
    # Slicing trades a little speed for a much lower VRAM ceiling, which is the
    # difference between running and OOM on a 12 GB card.
    pipeline.enable_vae_slicing()

    generator = torch.Generator(device="cuda").manual_seed(seed)
    output = pipeline(
        prompt,
        num_frames=num_frames,
        num_inference_steps=steps,
        generator=generator,
    )
    return list(output.frames[0])


def _image_to_video(
    model_id: str,
    weights_dir: str | None,
    image_path: str,
    num_frames: int,
    steps: int,
    seed: int,
) -> list[Any]:
    import torch  # type: ignore[import-not-found]
    from diffusers import (  # type: ignore[import-not-found]
        StableVideoDiffusionPipeline,
    )
    from PIL import Image  # type: ignore[import-not-found]

    svd_id = os.getenv("VIDEO_I2V_MODEL_ID", "stabilityai/stable-video-diffusion-img2vid")
    pipeline = StableVideoDiffusionPipeline.from_pretrained(
        svd_id, torch_dtype=torch.float16, cache_dir=weights_dir
    )
    pipeline.to("cuda")
    pipeline.enable_model_cpu_offload()

    with Image.open(image_path) as handle:
        conditioning = handle.convert("RGB")

    generator = torch.Generator(device="cuda").manual_seed(seed)
    output = pipeline(
        conditioning,
        num_frames=num_frames,
        num_inference_steps=steps,
        generator=generator,
    )
    return list(output.frames[0])


def _encode(frames: list[Any], fps: int) -> tuple[bytes, int, int]:
    """Mux frames into an MP4 and return ``(bytes, width, height)``.

    diffusers ships ``export_to_video``, which writes through imageio-ffmpeg.
    That is a real encode -- the bytes returned are a playable file, not a
    placeholder -- which is what lets the caller publish a URL for it.
    """
    import tempfile

    from diffusers.utils import export_to_video  # type: ignore[import-not-found]

    width, height = frames[0].size if hasattr(frames[0], "size") else (0, 0)

    with tempfile.TemporaryDirectory() as directory:
        path = os.path.join(directory, "clip.mp4")
        export_to_video(frames, path, fps=fps)
        with open(path, "rb") as handle:
            payload = handle.read()

    return payload, int(width), int(height)
