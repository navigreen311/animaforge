"""D10 LoRA fine-tuning.

:mod:`.lora` is a real diffusers + peft adapter behind ``TRAINING_ENGINE=real``,
gated on a CUDA GPU and a base checkpoint. Unprovisioned, a job is recorded as
unrun -- never as completed -- and no adapter URL is returned.
"""

from __future__ import annotations

__all__ = ["lora"]
