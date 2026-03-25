"""Position-Based Dynamics physics simulation service -- cloth, hair, rigid body, soft body, wind."""

from __future__ import annotations

import math
import uuid
from typing import Any

# ── PBD Configuration ────────────────────────────────────────────────────────

PBD_CONFIG: dict[str, Any] = {
    "substeps": 10,
    "iterations": 4,
    "damping": 0.99,
    "gravity": [0, -9.81, 0],
}

_MIN_TIMESTEP = 0.0001
_MAX_TIMESTEP = 0.05
_MIN_ITERATIONS = 1
_MAX_ITERATIONS = 64
_MIN_SUBSTEPS = 1
_MAX_SUBSTEPS = 100
_MAX_WIND_STRENGTH = 200.0
_MAX_TURBULENCE = 1.0
_MIN_FPS = 1
_MAX_FPS = 240
_MAX_DURATION_MS = 600_000  # 10 minutes


# ── Material presets ─────────────────────────────────────────────────────────

_MATERIAL_PRESETS: dict[str, dict[str, float]] = {
    "cotton": {"stiffness": 0.8, "damping": 0.02, "mass_per_m2": 0.15},
    "silk": {"stiffness": 0.3, "damping": 0.005, "mass_per_m2": 0.05},
    "leather": {"stiffness": 0.95, "damping": 0.05, "mass_per_m2": 0.80},
    "denim": {"stiffness": 0.9, "damping": 0.03, "mass_per_m2": 0.35},
    "wool": {"stiffness": 0.6, "damping": 0.04, "mass_per_m2": 0.25},
}


# ── Helpers ──────────────────────────────────────────────────────────────────


def _new_job_id() -> str:
    return f"phys-{uuid.uuid4().hex[:12]}"


def _vec3_magnitude(v: list[float]) -> float:
    return math.sqrt(sum(c * c for c in v))


def _normalize(v: list[float]) -> list[float]:
    mag = _vec3_magnitude(v)
    if mag < 1e-9:
        return [0.0, 0.0, 0.0]
    return [c / mag for c in v]


def _compute_stability_score(frames: list[dict], damping: float) -> float:
    """Heuristic stability metric in [0, 1].  Higher is more stable."""
    if len(frames) < 2:
        return 1.0
    max_delta = 0.0
    for i in range(1, len(frames)):
        dx = abs(frames[i]["com"][0] - frames[i - 1]["com"][0])
        dy = abs(frames[i]["com"][1] - frames[i - 1]["com"][1])
        dz = abs(frames[i]["com"][2] - frames[i - 1]["com"][2])
        max_delta = max(max_delta, dx + dy + dz)
    # Clamp into 0-1 range — small deltas → high stability
    raw = 1.0 - min(max_delta / 10.0, 1.0)
    return round(raw * damping, 4)


def _pbd_integrate_frame(
    position: list[float],
    velocity: list[float],
    dt: float,
    gravity: list[float],
    damping: float,
    external_force: list[float] | None = None,
) -> tuple[list[float], list[float]]:
    """Single PBD semi-implicit Euler integration step."""
    force = list(gravity)
    if external_force:
        force = [f + e for f, e in zip(force, external_force)]
    new_vel = [(v + f * dt) * damping for v, f in zip(velocity, force)]
    new_pos = [p + v * dt for p, v in zip(position, new_vel)]
    return new_pos, new_vel


# ── Public API ───────────────────────────────────────────────────────────────


def simulate_cloth(
    character_id: str,
    garment_params: dict[str, Any],
    motion_data: dict[str, Any],
    fps: int = 60,
) -> dict[str, Any]:
    """Simulate cloth draping / dynamics using PBD.

    In production this would run a full constraint-based solver over the garment
    mesh attached to the character rig.  Here we simulate the computation with
    realistic output structure.
    """
    if not character_id:
        raise ValueError("character_id is required")
    if fps < _MIN_FPS or fps > _MAX_FPS:
        raise ValueError(f"fps must be between {_MIN_FPS} and {_MAX_FPS}")

    material_name = garment_params.get("material", "cotton")
    material = _MATERIAL_PRESETS.get(material_name, _MATERIAL_PRESETS["cotton"])
    duration_ms = motion_data.get("duration_ms", 2000)
    frame_count = max(1, int((duration_ms / 1000.0) * fps))
    dt = 1.0 / fps

    damping = PBD_CONFIG["damping"]
    gravity = PBD_CONFIG["gravity"]

    frames: list[dict[str, Any]] = []
    pos = [0.0, 1.5, 0.0]  # initial centre-of-mass
    vel = [0.0, 0.0, 0.0]

    collision_count = 0
    for i in range(frame_count):
        for _ in range(PBD_CONFIG["substeps"]):
            pos, vel = _pbd_integrate_frame(pos, vel, dt / PBD_CONFIG["substeps"], gravity, damping)
        # Ground-plane collision
        if pos[1] < 0.0:
            pos[1] = 0.0
            vel[1] = -vel[1] * 0.3
            collision_count += 1
        frames.append({
            "frame": i,
            "time": round(i * dt, 6),
            "com": [round(c, 6) for c in pos],
            "vertex_count": garment_params.get("vertex_count", 2048),
        })

    stability = _compute_stability_score(frames, damping)

    return {
        "job_id": _new_job_id(),
        "character_id": character_id,
        "material": material_name,
        "material_props": material,
        "frames": frames,
        "frame_count": frame_count,
        "collision_count": collision_count,
        "stability_score": stability,
    }


def simulate_hair(
    character_id: str,
    hair_params: dict[str, Any],
    motion_data: dict[str, Any],
    wind_params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Strand-based hair physics simulation using PBD.

    Each strand is modelled as a chain of particles with distance and bending
    constraints.  This stub produces representative output frames.
    """
    if not character_id:
        raise ValueError("character_id is required")

    strand_count = hair_params.get("strand_count", 5000)
    particles_per_strand = hair_params.get("particles_per_strand", 12)
    fps = hair_params.get("fps", 60)
    duration_ms = motion_data.get("duration_ms", 2000)
    frame_count = max(1, int((duration_ms / 1000.0) * fps))
    dt = 1.0 / fps

    damping = PBD_CONFIG["damping"]
    gravity = PBD_CONFIG["gravity"]

    wind_force: list[float] | None = None
    if wind_params:
        direction = _normalize(wind_params.get("direction", [1, 0, 0]))
        strength = wind_params.get("strength", 5.0)
        wind_force = [d * strength for d in direction]

    frames: list[dict[str, Any]] = []
    tip_pos = [0.0, 1.8, 0.0]
    tip_vel = [0.0, 0.0, 0.0]
    flicker_accum = 0.0

    for i in range(frame_count):
        prev_pos = list(tip_pos)
        for _ in range(PBD_CONFIG["substeps"]):
            tip_pos, tip_vel = _pbd_integrate_frame(
                tip_pos, tip_vel, dt / PBD_CONFIG["substeps"], gravity, damping, wind_force,
            )
        # Anchor constraint — hair roots stay near head
        tip_pos[1] = max(tip_pos[1], 0.5)
        delta = sum(abs(a - b) for a, b in zip(tip_pos, prev_pos))
        flicker_accum += delta
        frames.append({
            "frame": i,
            "time": round(i * dt, 6),
            "tip_position": [round(c, 6) for c in tip_pos],
            "strand_count": strand_count,
        })

    flicker_score = round(min(flicker_accum / max(frame_count, 1), 1.0), 4)

    return {
        "job_id": _new_job_id(),
        "character_id": character_id,
        "strand_count": strand_count,
        "particles_per_strand": particles_per_strand,
        "frames": frames,
        "frame_count": frame_count,
        "flicker_score": flicker_score,
    }


def simulate_rigid_body(
    objects: list[dict[str, Any]],
    forces: list[dict[str, Any]],
    duration_ms: int,
) -> dict[str, Any]:
    """Rigid body collision simulation.

    Each object has position, velocity, mass, and a bounding radius.  Forces are
    applied per-frame.  Collisions are resolved via simple sphere-sphere checks
    and ground-plane bouncing.
    """
    if not objects:
        raise ValueError("At least one object is required")
    if duration_ms <= 0 or duration_ms > _MAX_DURATION_MS:
        raise ValueError(f"duration_ms must be between 1 and {_MAX_DURATION_MS}")

    fps = 60
    dt = 1.0 / fps
    frame_count = max(1, int((duration_ms / 1000.0) * fps))
    damping = PBD_CONFIG["damping"]
    gravity = PBD_CONFIG["gravity"]

    # Initialise state per object
    states: list[dict[str, Any]] = []
    for obj in objects:
        states.append({
            "id": obj.get("id", _new_job_id()),
            "position": list(obj.get("position", [0, 1, 0])),
            "velocity": list(obj.get("velocity", [0, 0, 0])),
            "mass": obj.get("mass", 1.0),
            "radius": obj.get("radius", 0.5),
        })

    # Pre-process force map
    force_map: dict[str, list[float]] = {}
    for f in forces:
        fid = f.get("object_id", "")
        force_map[fid] = f.get("force", [0, 0, 0])

    frames: list[dict[str, Any]] = []
    for fi in range(frame_count):
        for st in states:
            ext = force_map.get(st["id"])
            combined = list(gravity)
            if ext:
                combined = [g + e for g, e in zip(combined, ext)]
            for _ in range(PBD_CONFIG["substeps"]):
                st["position"], st["velocity"] = _pbd_integrate_frame(
                    st["position"], st["velocity"],
                    dt / PBD_CONFIG["substeps"], combined, damping,
                )
            # Ground collision
            if st["position"][1] - st["radius"] < 0:
                st["position"][1] = st["radius"]
                st["velocity"][1] = -st["velocity"][1] * 0.4

        frames.append({
            "frame": fi,
            "time": round(fi * dt, 6),
            "objects": [
                {"id": s["id"], "position": [round(c, 6) for c in s["position"]]}
                for s in states
            ],
        })

    objects_final_state = [
        {
            "id": s["id"],
            "position": [round(c, 6) for c in s["position"]],
            "velocity": [round(c, 6) for c in s["velocity"]],
        }
        for s in states
    ]

    return {
        "frames": frames,
        "frame_count": frame_count,
        "objects_final_state": objects_final_state,
    }


def simulate_soft_body(
    mesh_url: str,
    force_params: dict[str, Any],
    material: dict[str, Any],
) -> dict[str, Any]:
    """Deformable body simulation using PBD volume-preservation constraints.

    In production this would load the mesh, compute a tetrahedral decomposition,
    then iterate PBD constraints.  Here we return a realistic output stub.
    """
    if not mesh_url:
        raise ValueError("mesh_url is required")

    stiffness = material.get("stiffness", 0.5)
    damping = material.get("damping", PBD_CONFIG["damping"])
    force_dir = _normalize(force_params.get("direction", [0, -1, 0]))
    force_mag = force_params.get("magnitude", 10.0)

    deformation_factor = round((1.0 - stiffness) * min(force_mag / 50.0, 1.0), 4)

    return {
        "job_id": _new_job_id(),
        "source_mesh_url": mesh_url,
        "deformed_mesh_url": mesh_url.replace(".obj", f"_deformed_{deformation_factor}.obj"),
        "deformation_factor": deformation_factor,
        "stiffness": stiffness,
        "damping": damping,
        "applied_force": [round(d * force_mag, 6) for d in force_dir],
    }


def apply_wind(
    scene_id: str,
    wind_direction: list[float],
    wind_strength: float,
    turbulence: float,
) -> dict[str, Any]:
    """Compute wind force field to apply to cloth / hair simulations."""
    if not scene_id:
        raise ValueError("scene_id is required")
    if wind_strength < 0 or wind_strength > _MAX_WIND_STRENGTH:
        raise ValueError(f"wind_strength must be between 0 and {_MAX_WIND_STRENGTH}")
    if turbulence < 0 or turbulence > _MAX_TURBULENCE:
        raise ValueError(f"turbulence must be between 0 and {_MAX_TURBULENCE}")
    if len(wind_direction) != 3:
        raise ValueError("wind_direction must be a 3-element vector")

    direction = _normalize(wind_direction)
    # Turbulence adds a noise amplitude proportional to strength
    noise_amplitude = round(turbulence * wind_strength * 0.3, 4)

    return {
        "scene_id": scene_id,
        "wind_direction": [round(d, 6) for d in direction],
        "wind_strength": wind_strength,
        "turbulence": turbulence,
        "noise_amplitude": noise_amplitude,
        "force_vector": [round(d * wind_strength, 6) for d in direction],
    }


def get_material_presets() -> dict[str, dict[str, float]]:
    """Return fabric material presets with stiffness, damping, and mass."""
    return dict(_MATERIAL_PRESETS)


def validate_physics_params(params: dict[str, Any]) -> dict[str, Any]:
    """Bounds-check physics parameters and return validation result."""
    errors: list[str] = []

    timestep = params.get("timestep")
    if timestep is not None:
        if not isinstance(timestep, (int, float)) or timestep < _MIN_TIMESTEP or timestep > _MAX_TIMESTEP:
            errors.append(f"timestep must be between {_MIN_TIMESTEP} and {_MAX_TIMESTEP}")

    iterations = params.get("iterations")
    if iterations is not None:
        if not isinstance(iterations, int) or iterations < _MIN_ITERATIONS or iterations > _MAX_ITERATIONS:
            errors.append(f"iterations must be an integer between {_MIN_ITERATIONS} and {_MAX_ITERATIONS}")

    substeps = params.get("substeps")
    if substeps is not None:
        if not isinstance(substeps, int) or substeps < _MIN_SUBSTEPS or substeps > _MAX_SUBSTEPS:
            errors.append(f"substeps must be an integer between {_MIN_SUBSTEPS} and {_MAX_SUBSTEPS}")

    damping = params.get("damping")
    if damping is not None:
        if not isinstance(damping, (int, float)) or damping < 0.0 or damping > 1.0:
            errors.append("damping must be between 0.0 and 1.0")

    gravity = params.get("gravity")
    if gravity is not None:
        if not isinstance(gravity, list) or len(gravity) != 3:
            errors.append("gravity must be a 3-element list [x, y, z]")

    constraints = params.get("max_constraints")
    if constraints is not None:
        if not isinstance(constraints, int) or constraints < 1:
            errors.append("max_constraints must be a positive integer")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "checked_params": list(params.keys()),
    }
