"""D10 training: LoRA fine-tuning through diffusers and peft.

The real adapter, gated on a CUDA GPU and a base checkpoint. LoRA is the
cheapest useful fine-tune — a few million trainable parameters against a frozen
base — but "cheapest" still means a GPU with 12 GB and tens of minutes, so it
is not something CI runs.

The adapter weights are written to storage as a real ``.safetensors`` file. The
unprovisioned path returns no artifact URL and reports the job unrun rather
than marking it complete.

**Never executed.** No GPU in CI, none on the machine this was written on.
Written against the documented diffusers/peft APIs. See
``docs/generation-pipeline.md``.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from ..engines import EngineUnavailable, probe, upgrade_available

DEFAULT_BASE_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"

#: LoRA rank. 4-16 is the usual band; higher captures more at proportionally
#: more VRAM and a larger adapter.
DEFAULT_RANK = 8


@dataclass(frozen=True)
class TrainingResult:
    """An adapter that was actually trained and written."""

    url: str
    steps: int
    rank: int
    base_model: str
    final_loss: float
    sha256: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "url": self.url,
            "steps": self.steps,
            "rank": self.rank,
            "base_model": self.base_model,
            "final_loss": round(self.final_loss, 5),
            "sha256": self.sha256,
        }


def training_available() -> bool:
    """True when LoRA training can actually run on this host."""
    return upgrade_available("training")


def train_lora(
    image_dir: str,
    *,
    job_id: str,
    steps: int = 500,
    rank: int = DEFAULT_RANK,
    learning_rate: float = 1e-4,
) -> TrainingResult:
    """Fine-tune a LoRA adapter on the images in *image_dir*.

    Raises:
        EngineUnavailable: if torch/diffusers/peft or the weights are missing,
            or if no CUDA device is present.
        FileNotFoundError: if *image_dir* is not a directory.
        ValueError: on a non-positive step count or rank.
    """
    if steps < 1:
        raise ValueError(f"steps must be >= 1, got {steps}")
    if rank < 1:
        raise ValueError(f"rank must be >= 1, got {rank}")

    status = probe("training")
    if not upgrade_available("training"):
        raise EngineUnavailable(
            "LoRA training needs the gated training engine. Missing: "
            + ", ".join(status.missing)
        )

    if not os.path.isdir(image_dir):
        raise FileNotFoundError(f"No training image directory at {image_dir}")

    import torch  # type: ignore[import-not-found]

    if not torch.cuda.is_available():
        # Training on CPU is not slow, it is measured in days. Refusing beats
        # appearing to hang.
        raise EngineUnavailable(
            "LoRA training requires a CUDA device; torch reports none. "
            "See docs/generation-pipeline.md for the VRAM floor."
        )

    from diffusers import StableDiffusionXLPipeline  # type: ignore[import-not-found]
    from peft import LoraConfig, get_peft_model  # type: ignore[import-not-found]

    base_model = os.getenv("TRAINING_BASE_MODEL", DEFAULT_BASE_MODEL)
    weights_dir = os.getenv("TRAINING_WEIGHTS_DIR") or None

    pipeline = StableDiffusionXLPipeline.from_pretrained(
        base_model, torch_dtype=torch.float16, cache_dir=weights_dir
    )
    pipeline.to("cuda")

    # Only the UNet's attention projections are adapted; the text encoders and
    # VAE stay frozen. That is what keeps a LoRA small and the VRAM bounded.
    config = LoraConfig(
        r=rank,
        lora_alpha=rank * 2,
        target_modules=["to_q", "to_k", "to_v", "to_out.0"],
        lora_dropout=0.0,
    )
    unet = get_peft_model(pipeline.unet, config)
    unet.train()

    optimiser = torch.optim.AdamW(
        [p for p in unet.parameters() if p.requires_grad], lr=learning_rate
    )

    images = _load_images(image_dir, pipeline)
    if not images:
        raise ValueError(f"No usable training images in {image_dir}")

    final_loss = 0.0
    for step in range(steps):
        batch = images[step % len(images)].unsqueeze(0).to("cuda", torch.float16)

        with torch.no_grad():
            latents = pipeline.vae.encode(batch).latent_dist.sample()
            latents = latents * pipeline.vae.config.scaling_factor

        noise = torch.randn_like(latents)
        timesteps = torch.randint(
            0,
            pipeline.scheduler.config.num_train_timesteps,
            (latents.shape[0],),
            device="cuda",
        )
        noisy = pipeline.scheduler.add_noise(latents, noise, timesteps)

        predicted = unet(noisy, timesteps, return_dict=False)[0]
        loss = torch.nn.functional.mse_loss(predicted.float(), noise.float())

        loss.backward()
        optimiser.step()
        optimiser.zero_grad()
        final_loss = float(loss.detach().cpu())

    payload = _serialise_adapter(unet)

    from ..avatar.storage import store_artifact

    artifact = store_artifact(
        f"training/{job_id}/adapter.safetensors",
        payload,
        "application/octet-stream",
    )

    return TrainingResult(
        url=artifact.url,
        steps=steps,
        rank=rank,
        base_model=base_model,
        final_loss=final_loss,
        sha256=artifact.sha256,
    )


def _load_images(image_dir: str, pipeline: Any) -> list[Any]:
    from PIL import Image  # type: ignore[import-not-found]

    names = sorted(
        n for n in os.listdir(image_dir) if n.lower().endswith((".png", ".jpg", ".jpeg"))
    )
    processor = pipeline.image_processor
    out = []
    for name in names:
        with Image.open(os.path.join(image_dir, name)) as handle:
            out.append(processor.preprocess(handle.convert("RGB"))[0])
    return out


def _serialise_adapter(unet: Any) -> bytes:
    """Serialise only the trainable LoRA tensors, not the frozen base."""
    import tempfile

    from safetensors.torch import save_file  # type: ignore[import-not-found]

    tensors = {
        name: param.detach().cpu()
        for name, param in unet.named_parameters()
        if param.requires_grad
    }

    with tempfile.TemporaryDirectory() as directory:
        path = os.path.join(directory, "adapter.safetensors")
        save_file(tensors, path)
        with open(path, "rb") as handle:
            return handle.read()
