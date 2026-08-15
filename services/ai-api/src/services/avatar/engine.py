"""Engine selection and capability probing for the X5 reconstruction pipeline.

The real reconstruction path needs a CUDA GPU, ``torch`` and a 3D Gaussian
Splatting kernel (``gsplat``), none of which exist on a stock CI runner.  This
module is the single place that decides whether that path can run, and it is
deliberately incapable of lying about it:

* :func:`probe` reports what is actually importable and visible right now.
* :func:`resolve_engine` picks the engine.  ``AVATAR_ENGINE=real`` on a host
  without the dependencies raises :class:`EngineUnavailable` — it never
  silently downgrades to the procedural engine, because a caller who asked for
  a real reconstruction must not receive a synthetic one labelled as real.
* ``AVATAR_ENGINE=mock`` (the default) selects the procedural engine, and
  every artifact and API response carries ``engine="mock"``.
"""

from __future__ import annotations

import importlib.util
import os
from dataclasses import asdict, dataclass
from pathlib import Path

ENGINE_MOCK = "mock"
ENGINE_REAL = "real"
VALID_ENGINES = (ENGINE_MOCK, ENGINE_REAL)

#: Packages the real Gaussian-splatting path imports at run time.
REAL_ENGINE_PACKAGES = ("torch", "gsplat")


class EngineUnavailable(RuntimeError):
    """Raised when the real engine is requested but cannot run here."""


@dataclass(frozen=True)
class Capability:
    """A snapshot of what the host can actually do."""

    requested_engine: str
    active_engine: str
    real_engine_available: bool
    torch_installed: bool
    gsplat_installed: bool
    nerfstudio_installed: bool
    cuda_available: bool
    cuda_device_count: int
    weights_dir: str | None
    weights_present: bool
    missing: list[str]
    notes: str

    def as_dict(self) -> dict[str, object]:
        return asdict(self)


def requested_engine() -> str:
    """Return the engine named by ``AVATAR_ENGINE`` (default ``mock``)."""
    value = os.getenv("AVATAR_ENGINE", ENGINE_MOCK).strip().lower() or ENGINE_MOCK
    if value not in VALID_ENGINES:
        raise ValueError(
            f"AVATAR_ENGINE must be one of {VALID_ENGINES}, got {value!r}"
        )
    return value


def weights_dir() -> Path | None:
    """Return the configured model-weights directory, if any."""
    raw = os.getenv("AVATAR_WEIGHTS_DIR", "").strip()
    return Path(raw).expanduser() if raw else None


def probe() -> Capability:
    """Inspect the host and report the true state of the real engine."""
    requested = requested_engine()

    torch_installed = _module_installed("torch")
    gsplat_installed = _module_installed("gsplat")
    nerfstudio_installed = _module_installed("nerfstudio")
    cuda_available, device_count = _probe_cuda(torch_installed)

    directory = weights_dir()
    weights_present = bool(directory and directory.is_dir() and any(directory.iterdir()))

    missing: list[str] = []
    if not torch_installed:
        missing.append("torch")
    if not gsplat_installed:
        missing.append("gsplat")
    if torch_installed and not cuda_available:
        missing.append("cuda-device")
    if directory is None:
        missing.append("AVATAR_WEIGHTS_DIR")
    elif not weights_present:
        missing.append(f"weights in {directory}")

    real_available = not missing
    active = requested if (requested == ENGINE_MOCK or real_available) else ENGINE_MOCK

    if real_available:
        notes = "Real 3DGS engine is available."
    elif requested == ENGINE_REAL:
        notes = (
            "AVATAR_ENGINE=real was requested but the host is missing: "
            + ", ".join(missing)
            + ". Reconstruction requests will fail rather than return mock output."
        )
    else:
        notes = (
            "Procedural (mock) engine active. Real engine unavailable — missing: "
            + ", ".join(missing)
            + "."
        )

    return Capability(
        requested_engine=requested,
        active_engine=active,
        real_engine_available=real_available,
        torch_installed=torch_installed,
        gsplat_installed=gsplat_installed,
        nerfstudio_installed=nerfstudio_installed,
        cuda_available=cuda_available,
        cuda_device_count=device_count,
        weights_dir=str(directory) if directory else None,
        weights_present=weights_present,
        missing=missing,
        notes=notes,
    )


def resolve_engine() -> str:
    """Return the engine to run with, or raise if ``real`` cannot be honoured."""
    capability = probe()
    if capability.requested_engine == ENGINE_REAL and not capability.real_engine_available:
        raise EngineUnavailable(capability.notes)
    return capability.active_engine


def real_engine_available() -> bool:
    """Convenience predicate used by tests to skip GPU-only cases."""
    return probe().real_engine_available


# ── Internals ────────────────────────────────────────────────────────────────


def _module_installed(name: str) -> bool:
    """Return True if ``name`` is importable without importing it."""
    try:
        return importlib.util.find_spec(name) is not None
    except (ImportError, ValueError):
        return False


def _probe_cuda(torch_installed: bool) -> tuple[bool, int]:
    if not torch_installed:
        return False, 0
    try:
        import torch  # type: ignore[import-not-found]

        if not torch.cuda.is_available():
            return False, 0
        return True, int(torch.cuda.device_count())
    except Exception:  # noqa: BLE001 - probing hardware must never crash
        # Driver mismatches, missing libcuda and permission errors all surface
        # here as unrelated exception types. A capability probe that raised
        # would be worse than one that reports 'no CUDA'.
        return False, 0
