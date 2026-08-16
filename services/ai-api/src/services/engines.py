"""Engine selection and capability probing for every generation cluster.

This generalises ``src.services.avatar.engine`` (the X5 reference pattern) to
the rest of the generation layer. It is the single place that decides whether a
cluster can run for real, and like the avatar module it is deliberately
incapable of lying:

* :func:`probe` reports what is actually importable or on PATH right now.
* :func:`resolve_engine` raises :class:`EngineUnavailable` when ``real`` is
  requested on a host that cannot honour it. It never silently downgrades --
  a caller who asked for real output must not receive synthetic output
  labelled as real.
* :func:`mock_marker` produces the machine-readable block that every mock
  response carries, so a caller never has to infer which it got.

Three states are reported, and the distinction matters:

``real``
    Runs a genuine implementation with no optional dependencies. CPU signal
    processing and deterministic engineering live here (E3, E8, F5, G6).
``real-gated``
    A genuine implementation exists but needs weights, a GPU or a binary that
    CI does not have. Mock until provisioned.
``mock``
    No real implementation exists yet. Always labelled as such in responses.
"""

from __future__ import annotations

import importlib.util
import os
import shutil
from dataclasses import asdict, dataclass, field

ENGINE_MOCK = "mock"
ENGINE_REAL = "real"
VALID_ENGINES = (ENGINE_MOCK, ENGINE_REAL)


class EngineUnavailable(RuntimeError):
    """Raised when the real engine is requested but cannot run here."""


@dataclass(frozen=True)
class EngineSpec:
    """What a cluster needs before its real path can run."""

    cluster: str
    name: str
    env_var: str
    summary: str
    #: Importable Python distributions the real path needs.
    packages: tuple[str, ...] = ()
    #: Executables the real path shells out to.
    binaries: tuple[str, ...] = ()
    #: Env var naming a directory of model weights, if the real path needs one.
    weights_env: str | None = None
    #: True when the default (unconfigured) path is already a real
    #: implementation -- no gating, nothing to provision.
    real_by_default: bool = False
    #: True when a real code path exists at all. False means the only
    #: implementation in the tree is synthetic: no amount of provisioning makes
    #: it real, because the adapter has not been written. Requesting ``real``
    #: on such a cluster fails loudly rather than pretending.
    real_implemented: bool = False


@dataclass(frozen=True)
class EngineStatus:
    """A snapshot of what this cluster can actually do, right now."""

    cluster: str
    name: str
    env_var: str
    requested_engine: str
    active_engine: str
    real_engine_available: bool
    status: str
    missing: list[str] = field(default_factory=list)
    packages_present: dict[str, bool] = field(default_factory=dict)
    binaries_present: dict[str, bool] = field(default_factory=dict)
    weights_dir: str | None = None
    notes: str = ""

    def as_dict(self) -> dict[str, object]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

#: Every generation cluster this service exposes. Clusters marked
#: ``real_by_default`` need nothing provisioned; the rest report exactly what a
#: human must install to move them from mock to real.
REGISTRY: tuple[EngineSpec, ...] = (
    EngineSpec(
        cluster="E3",
        name="scene_graph",
        env_var="SCENE_GRAPH_ENGINE",
        summary="Structured scene decomposition between prompt and render.",
        real_by_default=True,
        real_implemented=True,
    ),
    EngineSpec(
        cluster="E8",
        name="mocap",
        env_var="MOCAP_ENGINE",
        summary="Motion capture retargeting and IK solving on CPU.",
        real_by_default=True,
        real_implemented=True,
    ),
    EngineSpec(
        cluster="F5",
        name="physics",
        env_var="PHYSICS_ENGINE",
        summary="Cloth, hair, rigid-body and fluid simulation on CPU.",
        real_by_default=True,
        real_implemented=True,
    ),
    EngineSpec(
        cluster="G6",
        name="qc",
        env_var="QC_ENGINE",
        summary=(
            "Measured QC: temporal stability, EBU R128 loudness, A/V sync and "
            "container validation, computed from the artifact. ffprobe/ffmpeg "
            "widen what can be decoded but are not required -- what cannot be "
            "measured is reported unmeasurable rather than scored."
        ),
        real_by_default=True,
        real_implemented=True,
    ),
    EngineSpec(
        cluster="E6",
        name="continuity",
        env_var="CONTINUITY_ENGINE",
        summary=(
            "Perceptual embeddings for shot-to-shot continuity. The default "
            "descriptor is computed from real pixels on CPU; CLIP is the "
            "gated upgrade for semantic similarity."
        ),
        packages=("torch", "open_clip_torch"),
        weights_env="CONTINUITY_WEIGHTS_DIR",
        real_by_default=True,
        real_implemented=True,
    ),
    EngineSpec(
        cluster="D3/D6",
        name="video",
        env_var="VIDEO_ENGINE",
        summary=(
            "Text-to-video and image-to-video diffusion. A real diffusers "
            "adapter exists and renders to a stored MP4, but it needs a CUDA "
            "GPU and multi-gigabyte weights, so it is gated. Unprovisioned, "
            "jobs are queued with no preview URL and an is_mock marker -- "
            "never a URL for a clip that was not rendered."
        ),
        packages=("torch", "diffusers"),
        weights_env="VIDEO_WEIGHTS_DIR",
        real_implemented=True,
    ),
    EngineSpec(
        cluster="D4",
        name="audio",
        env_var="AUDIO_ENGINE",
        summary=(
            "Lip-sync phoneme timing. Rule-based ARPABET grapheme-to-phoneme "
            "and a segmental duration model run on CPU by default with no "
            "weights; CTC forced alignment against a real waveform is the "
            "gated upgrade. Speech SYNTHESIS is not implemented -- that path "
            "is still mock and says so in every response."
        ),
        packages=("torch", "torchaudio"),
        weights_env="AUDIO_WEIGHTS_DIR",
        real_by_default=True,
        real_implemented=True,
    ),
    EngineSpec(
        cluster="X6",
        name="style",
        env_var="STYLE_ENGINE",
        summary=(
            "Style fingerprinting and transfer. Palette, contrast, saturation "
            "and edge density are measured from decoded pixels on CPU with no "
            "weights; sources that cannot be decoded are reported unmeasured "
            "rather than invented. CLIP semantic embedding is the gated "
            "upgrade. Style TRANSFER is not implemented -- it needs a "
            "diffusion model and a GPU, and that path stays mock."
        ),
        packages=("torch", "open_clip_torch"),
        weights_env="STYLE_WEIGHTS_DIR",
        real_by_default=True,
        real_implemented=True,
    ),
    EngineSpec(
        cluster="G2",
        name="dubbing",
        env_var="DUBBING_ENGINE",
        summary=(
            "Multi-language dubbing with voice cloning. NOT IMPLEMENTED -- "
            "there is no adapter, and setting DUBBING_ENGINE=real will not "
            "produce one. Translation, synthesis and remux all return "
            "is_mock with no artifact URL. The D4 phoneme timing this would "
            "build on is real; the voice model is the missing piece."
        ),
        packages=("torch", "torchaudio"),
        weights_env="DUBBING_WEIGHTS_DIR",
    ),
    EngineSpec(
        cluster="D10",
        name="training",
        env_var="TRAINING_ENGINE",
        summary=(
            "LoRA fine-tuning via diffusers and peft. A real adapter exists "
            "and writes a .safetensors adapter to storage; it is gated on a "
            "CUDA GPU and a base checkpoint. Unprovisioned, jobs report "
            "not_implemented rather than completing on a timer."
        ),
        packages=("torch", "diffusers", "peft"),
        weights_env="TRAINING_WEIGHTS_DIR",
        real_implemented=True,
    ),
    EngineSpec(
        cluster="F3",
        name="music",
        env_var="MUSIC_ENGINE",
        summary=(
            "Music generation via audiocraft/MusicGen. A real adapter exists "
            "and writes a stored WAV; it is gated on a multi-gigabyte "
            "checkpoint and, above the small size, a GPU. Unprovisioned, cue "
            "sheets are placeholders and no audio URL is returned."
        ),
        packages=("torch", "audiocraft"),
        weights_env="MUSIC_WEIGHTS_DIR",
        real_implemented=True,
    ),
)

_BY_NAME = {spec.name: spec for spec in REGISTRY}


def spec_for(name: str) -> EngineSpec:
    """Return the registry entry for *name*, or raise KeyError."""
    return _BY_NAME[name]


# ---------------------------------------------------------------------------
# Probing
# ---------------------------------------------------------------------------


def requested_engine(spec: EngineSpec) -> str:
    """Return the engine named by the cluster's env var (default ``mock``)."""
    default = ENGINE_REAL if spec.real_by_default else ENGINE_MOCK
    value = os.getenv(spec.env_var, default).strip().lower() or default
    if value not in VALID_ENGINES:
        raise ValueError(
            f"{spec.env_var} must be one of {VALID_ENGINES}, got {value!r}"
        )
    return value


def probe(name: str) -> EngineStatus:
    """Inspect the host and report the true state of one cluster."""
    spec = spec_for(name)
    requested = requested_engine(spec)

    packages = {pkg: _module_installed(pkg) for pkg in spec.packages}
    binaries = {b: shutil.which(b) is not None for b in spec.binaries}

    weights_raw = os.getenv(spec.weights_env, "").strip() if spec.weights_env else ""
    weights_present = bool(weights_raw) and os.path.isdir(weights_raw)

    missing = [pkg for pkg, ok in packages.items() if not ok]
    missing += [b for b, ok in binaries.items() if not ok]
    if spec.weights_env and not weights_raw:
        missing.append(spec.weights_env)
    elif spec.weights_env and not weights_present:
        missing.append(f"weights in {weights_raw}")

    # A cluster with no real adapter can never be available, however much is
    # installed. Saying otherwise would let `?_ENGINE=real` look honourable
    # right up to the point it had no code to run.
    if not spec.real_implemented:
        real_available = False
        missing = ["no real engine adapter is implemented for this cluster"]
    else:
        real_available = spec.real_by_default or not missing

    active = requested if (requested == ENGINE_MOCK or real_available) else ENGINE_MOCK

    # `status` describes the implementation in the tree; `active_engine` and
    # `real_engine_available` describe this host. Conflating them made a
    # provisioned-but-unselected cluster indistinguishable from one with no
    # implementation at all.
    if not spec.real_implemented:
        status = "mock"
    elif spec.real_by_default:
        status = "real"
    else:
        status = "real-gated"

    return EngineStatus(
        cluster=spec.cluster,
        name=spec.name,
        env_var=spec.env_var,
        requested_engine=requested,
        active_engine=active,
        real_engine_available=real_available,
        status=status,
        missing=missing,
        packages_present=packages,
        binaries_present=binaries,
        weights_dir=weights_raw or None,
        notes=_notes(spec, requested, real_available, missing),
    )


def probe_all() -> list[EngineStatus]:
    """Probe every registered cluster."""
    return [probe(spec.name) for spec in REGISTRY]


def resolve_engine(name: str) -> str:
    """Return the engine to run with, or raise if ``real`` cannot be honoured."""
    status = probe(name)
    if status.requested_engine == ENGINE_REAL and not status.real_engine_available:
        raise EngineUnavailable(status.notes)
    return status.active_engine


def real_engine_available(name: str) -> bool:
    """True when this cluster can produce real output on this host.

    Note that a ``real_by_default`` cluster is always available -- its default
    path needs nothing. To ask whether the *gated upgrade* is provisioned, use
    :func:`upgrade_available`, which is a different question.
    """
    return probe(name).real_engine_available


def upgrade_available(name: str) -> bool:
    """True when a cluster's optional upgrade is fully provisioned.

    Several clusters are real by default *and* have a heavier path behind
    packages and weights: D4 models phoneme durations on CPU but measures them
    from audio once torchaudio is present; X6 measures pixel statistics
    anywhere but embeds with CLIP once open_clip is present.

    For those, :attr:`EngineStatus.real_engine_available` is always True --
    the default path needs nothing -- so it cannot answer "is the upgrade
    installed?". This can: it ignores ``real_by_default`` and reports purely on
    whether every declared package, binary and weights directory is present.

    Clusters with nothing declared have no upgrade, so this returns False.
    """
    spec = spec_for(name)
    if not (spec.packages or spec.binaries or spec.weights_env):
        return False

    if any(not _module_installed(pkg) for pkg in spec.packages):
        return False
    if any(shutil.which(binary) is None for binary in spec.binaries):
        return False
    if spec.weights_env:
        directory = os.getenv(spec.weights_env, "").strip()
        if not directory or not os.path.isdir(directory):
            return False
    return True


# ---------------------------------------------------------------------------
# Response labelling
# ---------------------------------------------------------------------------


def mock_marker(name: str, *, detail: str = "") -> dict[str, object]:
    """The block every mock response carries.

    Machine-readable on purpose: a caller checks ``engine == "mock"`` or
    ``is_mock is True`` rather than parsing prose. ``to_enable`` names exactly
    what a human must provision, so the answer to "why is this fake?" is in the
    response itself rather than in a doc somewhere.
    """
    spec = spec_for(name)
    status = probe(name)
    marker: dict[str, object] = {
        "engine": ENGINE_MOCK,
        "is_mock": True,
        "cluster": spec.cluster,
        "reason": detail or f"No real {spec.name} engine is active on this host.",
        "to_enable": _to_enable(spec, status),
    }
    if status.missing:
        marker["missing"] = status.missing
    return marker


def real_marker(name: str, *, detail: str = "") -> dict[str, object]:
    """The counterpart block for output that a real engine actually produced."""
    spec = spec_for(name)
    marker: dict[str, object] = {
        "engine": ENGINE_REAL,
        "is_mock": False,
        "cluster": spec.cluster,
    }
    if detail:
        marker["detail"] = detail
    return marker


# ── Internals ────────────────────────────────────────────────────────────────


def _to_enable(spec: EngineSpec, status: EngineStatus) -> str:
    if not spec.real_implemented:
        return (
            f"Nothing yet -- no real {spec.name} adapter has been written. "
            f"Provisioning weights or setting {spec.env_var}=real will not "
            "change the output; the engine has to be implemented first."
        )
    if spec.real_by_default:
        return "Nothing -- this cluster is real by default."
    steps = ["pip install -r requirements-ml.txt", f"set {spec.env_var}=real"]
    if spec.weights_env:
        steps.append(f"point {spec.weights_env} at a directory of model weights")
    if spec.binaries:
        steps.append(f"install {', '.join(spec.binaries)} on PATH")
    return "; ".join(steps) + "."


def _notes(
    spec: EngineSpec, requested: str, real_available: bool, missing: list[str]
) -> str:
    if not spec.real_implemented:
        return (
            f"No real {spec.name} engine exists in this tree yet -- output is "
            f"synthetic and every response says so. {spec.summary}"
        )
    if spec.real_by_default:
        return f"{spec.summary} Real implementation, no provisioning required."
    if real_available and requested == ENGINE_REAL:
        return f"Real {spec.name} engine is available and active."
    if real_available:
        return (
            f"Real {spec.name} engine is available but not requested. "
            f"Set {spec.env_var}=real to use it."
        )
    if requested == ENGINE_REAL:
        return (
            f"{spec.env_var}=real was requested but the host is missing: "
            + ", ".join(missing)
            + ". Requests will fail rather than return mock output."
        )
    return (
        f"Mock {spec.name} engine active. Real engine unavailable -- missing: "
        + ", ".join(missing)
        + "."
    )


def _module_installed(name: str) -> bool:
    """Return True if *name* is importable, without importing it."""
    try:
        return importlib.util.find_spec(name) is not None
    except (ImportError, ValueError, ModuleNotFoundError):
        return False
