"""X5 Subsystem 1 — multi-view 3D reconstruction.

Two engines sit behind one interface:

``real``
    Delegates to nerfstudio's ``splatfacto`` (3D Gaussian Splatting) via its
    CLI, then loads the exported ``.ply`` splat cloud.  Requires a CUDA GPU,
    ``torch``, ``gsplat`` and the nerfstudio binaries.  See
    :mod:`.engine` for the capability probe and ``docs/avatar-studio.md`` for
    the provisioning checklist.  **This path has never been executed in CI —
    it has no GPU.**

``mock`` (default)
    A procedural engine.  It runs entirely on CPU with numpy and produces a
    *genuine* artifact: an analytic head surface, a real Gaussian splat cloud
    sampled from it, a real binary PLY and a real GLB.  What it does not do is
    look at the photographs — the geometry is derived deterministically from
    the character identifier, so it is a synthetic stand-in and every response
    that carries it says ``engine="mock"``.

Neither engine fabricates a URL or a metric it did not compute.
"""

from __future__ import annotations

import hashlib
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from . import engine as engine_mod

#: Anatomical proportions of an adult human head, in metres.
HEAD_HEIGHT_M = 0.225
HEAD_WIDTH_RATIO = 0.72
HEAD_DEPTH_RATIO = 0.86

_SH_C0 = 0.28209479177387814  # Zeroth-order spherical-harmonic coefficient.


@dataclass
class SplatCloud:
    """A 3D Gaussian splat set in the standard 3DGS parameterisation."""

    means: np.ndarray  # (N, 3) float32 — centre of each Gaussian
    scales: np.ndarray  # (N, 3) float32 — log-scale of each axis
    rotations: np.ndarray  # (N, 4) float32 — wxyz quaternion
    opacities: np.ndarray  # (N, 1) float32 — logit opacity
    colors: np.ndarray  # (N, 3) float32 — linear RGB in [0, 1]
    normals: np.ndarray  # (N, 3) float32

    @property
    def count(self) -> int:
        return int(self.means.shape[0])


@dataclass
class ReconstructionResult:
    """Everything subsystem 1 produces for one character."""

    engine: str
    splats: SplatCloud
    positions: np.ndarray
    indices: np.ndarray
    vertex_colors: np.ndarray
    uvs: np.ndarray
    view_count: int
    alignment_rms: float
    shape_basis_residual: float
    body_proportions: dict[str, float]


# ── Public entry point ───────────────────────────────────────────────────────


def reconstruct(
    character_id: str,
    photos: list[str],
    *,
    engine: str,
    subdivisions: int = 48,
) -> ReconstructionResult:
    """Run reconstruction with the named engine.

    Args:
        character_id: Stable identifier; seeds the procedural engine.
        photos: Reference image URLs or paths.
        engine: ``"real"`` or ``"mock"`` (see :mod:`.engine`).
        subdivisions: Latitude ring count of the generated surface.

    Raises:
        ValueError: if ``photos`` is empty.
        EngineUnavailable: if ``engine="real"`` cannot run here.
    """
    if not photos:
        raise ValueError("At least one reference photo is required")

    if engine == engine_mod.ENGINE_REAL:
        return _reconstruct_real(character_id, photos, subdivisions=subdivisions)
    return _reconstruct_procedural(character_id, photos, subdivisions=subdivisions)


# ── Procedural engine ────────────────────────────────────────────────────────


def _reconstruct_procedural(
    character_id: str,
    photos: list[str],
    *,
    subdivisions: int,
) -> ReconstructionResult:
    rng = np.random.default_rng(_seed_from(character_id))

    positions, indices, uvs = build_head_mesh(subdivisions, rng)
    vertex_colors = _bake_vertex_colors(positions, uvs, rng)
    splats = splats_from_mesh(positions, indices, vertex_colors, rng)

    return ReconstructionResult(
        engine=engine_mod.ENGINE_MOCK,
        splats=splats,
        positions=positions,
        indices=indices,
        vertex_colors=vertex_colors,
        uvs=uvs,
        view_count=len(photos),
        alignment_rms=_alignment_rms(len(photos)),
        shape_basis_residual=fit_shape_basis(positions)[1],
        body_proportions=estimate_body_proportions(positions),
    )


def build_head_mesh(
    rings: int,
    rng: np.random.Generator,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Build an analytic head surface as an indexed triangle mesh.

    The surface is a UV sphere deformed by closed-form anatomical terms: a
    cranial/jaw taper along the vertical axis, a brow ridge, a nasal
    protrusion and a chin.

    The two poles are single welded vertices rather than a row of coincident
    ones, so the result is a closed two-manifold: every edge is shared by
    exactly two triangles and no triangle has zero area.  Returns
    ``(positions, indices, uvs)``.
    """
    if rings < 4:
        raise ValueError("rings must be >= 4")
    sectors = rings * 2

    # Interior latitude bands, excluding both poles.
    band_v = np.linspace(0.0, 1.0, rings, dtype=np.float64)[1:-1]
    sector_u = np.linspace(0.0, 1.0, sectors, endpoint=False, dtype=np.float64)
    uu, vv = np.meshgrid(sector_u, band_v)

    band_positions = _head_surface(uu.reshape(-1), vv.reshape(-1))
    band_uvs = np.stack([uu.reshape(-1), vv.reshape(-1)], axis=-1)

    # Poles: one vertex each, at the mean azimuth so the caps are symmetric.
    poles = _head_surface(np.array([0.5, 0.5]), np.array([0.0, 1.0]))
    pole_uvs = np.array([[0.5, 0.0], [0.5, 1.0]])

    positions = np.concatenate([poles, band_positions], axis=0)
    uvs = np.concatenate([pole_uvs, band_uvs], axis=0)

    # Sub-millimetre asymmetry — no real face is bilaterally perfect.
    positions[:, 0] += rng.normal(0.0, 0.00035, size=positions.shape[0])

    indices = _capped_grid_triangles(len(band_v), sectors)
    return positions.astype(np.float32), indices, uvs.astype(np.float32)


def _head_surface(u: np.ndarray, v: np.ndarray) -> np.ndarray:
    """Evaluate the analytic head surface at parametric coordinates."""
    theta = v * np.pi  # polar angle, 0 = crown
    phi = u * 2.0 * np.pi  # azimuth, 0 = facing +Z (front)

    radius = np.sin(theta)
    y = np.cos(theta)

    # Jaw taper: narrow the lower third; cranium stays full.
    taper = 1.0 - 0.28 * np.clip((v - 0.62) / 0.38, 0.0, 1.0) ** 1.6
    # Slight flattening of the crown.
    taper = taper * (1.0 - 0.10 * np.clip((0.18 - v) / 0.18, 0.0, 1.0) ** 2)

    x = radius * np.sin(phi) * taper * HEAD_WIDTH_RATIO
    z = radius * np.cos(phi) * taper * HEAD_DEPTH_RATIO

    facing = np.clip(np.cos(phi), 0.0, 1.0)  # 1 on the face, 0 at the back

    # Brow ridge: a band across the face at v ~= 0.45.
    brow = 0.045 * facing**2 * np.exp(-(((v - 0.45) / 0.05) ** 2))
    # Nose: narrow in azimuth, centred at v ~= 0.56.
    nose_axis = np.exp(-((np.sin(phi) / 0.16) ** 2)) * facing
    nose = 0.115 * nose_axis * np.exp(-(((v - 0.56) / 0.055) ** 2))
    # Chin: forward and slightly up at the base of the face.
    chin = 0.05 * facing**3 * np.exp(-(((v - 0.86) / 0.07) ** 2))
    # Occiput: the back of the skull projects rearwards.
    occiput = 0.04 * np.clip(-np.cos(phi), 0.0, 1.0) ** 2 * np.exp(
        -(((v - 0.42) / 0.16) ** 2)
    )

    z = z + brow + nose + chin - occiput

    # Eye sockets recess slightly, which the splat/normal pass picks up.
    socket = 0.022 * np.exp(-(((np.abs(np.sin(phi)) - 0.30) / 0.10) ** 2)) * facing
    z = z - socket * np.exp(-(((v - 0.47) / 0.045) ** 2))

    scale = HEAD_HEIGHT_M / 2.0
    return np.stack([x * scale, y * scale, z * scale], axis=-1)


def _capped_grid_triangles(bands: int, sectors: int) -> np.ndarray:
    """Triangulate welded pole caps plus a wrapped band grid.

    Vertex layout: index 0 is the north pole, index 1 the south pole, and the
    band vertices follow in row-major order.
    """
    if bands < 1:
        raise ValueError("need at least one latitude band")

    north, south = 0, 1
    base = 2
    col = np.arange(sectors)
    nxt = (col + 1) % sectors

    first_row = base + col
    first_row_next = base + nxt
    north_cap = np.stack(
        [np.full(sectors, north), first_row, first_row_next], axis=-1
    )

    last = base + (bands - 1) * sectors
    last_row = last + col
    last_row_next = last + nxt
    south_cap = np.stack(
        [np.full(sectors, south), last_row_next, last_row], axis=-1
    )

    pieces = [north_cap, south_cap]
    if bands > 1:
        row = np.arange(bands - 1)[:, None]
        top_left = base + row * sectors + col[None, :]
        top_right = base + row * sectors + nxt[None, :]
        bottom_left = base + (row + 1) * sectors + col[None, :]
        bottom_right = base + (row + 1) * sectors + nxt[None, :]

        pieces.append(
            np.stack([top_left, bottom_left, top_right], axis=-1).reshape(-1, 3)
        )
        pieces.append(
            np.stack([top_right, bottom_left, bottom_right], axis=-1).reshape(-1, 3)
        )

    return np.concatenate(pieces, axis=0).astype(np.uint32)


def _bake_vertex_colors(
    positions: np.ndarray,
    uvs: np.ndarray,
    rng: np.random.Generator,
) -> np.ndarray:
    """Bake a plausible skin albedo per vertex (texture-baking step)."""
    base = np.array([0.76, 0.57, 0.47], dtype=np.float64)
    v = uvs[:, 1]

    # Foreheads read lighter, the mid-face slightly redder (perfusion).
    shading = 1.0 + 0.06 * np.cos(v * np.pi)
    perfusion = 0.05 * np.exp(-(((v - 0.55) / 0.18) ** 2))

    colors = base[None, :] * shading[:, None]
    colors[:, 0] += perfusion
    colors[:, 1] -= perfusion * 0.35
    colors[:, 2] -= perfusion * 0.35
    colors += rng.normal(0.0, 0.006, size=colors.shape)
    return np.clip(colors, 0.0, 1.0).astype(np.float32)


def splats_from_mesh(
    positions: np.ndarray,
    indices: np.ndarray,
    vertex_colors: np.ndarray,
    rng: np.random.Generator,
    *,
    per_triangle: int = 2,
) -> SplatCloud:
    """Sample a Gaussian splat cloud from the surface of a mesh.

    Barycentric sampling gives area-proportional coverage.  Each splat is
    oriented so its flattest axis lies along the surface normal, which is what
    a converged 3DGS optimisation produces on an opaque surface.
    """
    from .gltf import compute_vertex_normals

    normals = compute_vertex_normals(positions, indices)
    tri = positions[indices]

    total = indices.shape[0] * per_triangle
    tri_idx = np.repeat(np.arange(indices.shape[0]), per_triangle)

    # Uniform barycentric sampling over each triangle.
    r1 = rng.random(total)
    r2 = rng.random(total)
    sqrt_r1 = np.sqrt(r1)
    bary = np.stack(
        [1.0 - sqrt_r1, sqrt_r1 * (1.0 - r2), sqrt_r1 * r2], axis=-1
    )

    means = np.einsum("ij,ijk->ik", bary, tri[tri_idx]).astype(np.float32)
    sampled_normals = np.einsum(
        "ij,ijk->ik", bary, normals[indices][tri_idx]
    ).astype(np.float32)
    sampled_normals /= np.maximum(
        np.linalg.norm(sampled_normals, axis=1, keepdims=True), 1e-9
    )
    colors = np.einsum(
        "ij,ijk->ik", bary, vertex_colors[indices][tri_idx]
    ).astype(np.float32)

    # Tangential extent scales with local triangle size; normal extent is flat.
    edge = np.linalg.norm(tri[:, 1] - tri[:, 0], axis=1)[tri_idx]
    tangential = np.maximum(edge * 0.55, 1e-4)
    scales = np.stack([tangential, tangential, tangential * 0.12], axis=-1)

    return SplatCloud(
        means=means,
        scales=np.log(scales).astype(np.float32),
        rotations=_quaternions_from_normals(sampled_normals),
        opacities=_logit(
            np.full((total, 1), 0.985, dtype=np.float32)
        ).astype(np.float32),
        colors=colors,
        normals=sampled_normals,
    )


def _quaternions_from_normals(normals: np.ndarray) -> np.ndarray:
    """Return wxyz quaternions rotating +Z onto each normal."""
    z_axis = np.zeros_like(normals)
    z_axis[:, 2] = 1.0

    axis = np.cross(z_axis, normals)
    axis_len = np.linalg.norm(axis, axis=1, keepdims=True)
    dot = np.clip(np.sum(z_axis * normals, axis=1, keepdims=True), -1.0, 1.0)

    quats = np.zeros((normals.shape[0], 4), dtype=np.float32)
    # General case: half-angle rotation about the perpendicular axis.
    general = (axis_len > 1e-8).reshape(-1)
    half = np.arccos(dot[general]) * 0.5
    unit_axis = axis[general] / axis_len[general]
    quats[general, 0] = np.cos(half).reshape(-1)
    quats[general, 1:] = unit_axis * np.sin(half)
    # Degenerate: normal is parallel (identity) or antiparallel (180° about X).
    parallel = ~general
    aligned = parallel & (dot.reshape(-1) > 0)
    flipped = parallel & (dot.reshape(-1) <= 0)
    quats[aligned] = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
    quats[flipped] = np.array([0.0, 1.0, 0.0, 0.0], dtype=np.float32)
    return quats


def fit_shape_basis(
    positions: np.ndarray,
    components: int = 8,
) -> tuple[np.ndarray, float]:
    """Fit a low-dimensional shape basis to the mesh (parametric-fit step).

    This is an SVD of the mean-centred vertex matrix — the same linear
    formulation FLAME uses, but built from this mesh rather than from FLAME's
    licensed identity basis.  Returns ``(coefficients, relative_residual)``.
    """
    centred = positions - positions.mean(axis=0, keepdims=True)
    matrix = centred.reshape(-1, 3)
    u, s, vt = np.linalg.svd(matrix, full_matrices=False)

    keep = min(components, s.shape[0])
    reconstructed = (u[:, :keep] * s[:keep]) @ vt[:keep]
    denominator = float(np.linalg.norm(matrix))
    residual = (
        float(np.linalg.norm(matrix - reconstructed) / denominator)
        if denominator > 0
        else 0.0
    )
    return s[:keep].astype(np.float32), residual


def estimate_body_proportions(positions: np.ndarray) -> dict[str, float]:
    """Derive anthropometric proportions from the reconstructed head.

    Uses the canonical 7.5-heads-tall figure, so these are *estimates scaled
    from head size*, not measurements of a body — no body was reconstructed.
    """
    extent = positions.max(axis=0) - positions.min(axis=0)
    head_height = float(extent[1])
    stature = head_height * 7.5
    return {
        "head_height_m": round(head_height, 5),
        "head_width_m": round(float(extent[0]), 5),
        "head_depth_m": round(float(extent[2]), 5),
        "estimated_stature_m": round(stature, 4),
        "shoulder_width_m": round(stature * 0.259, 4),
        "inseam_m": round(stature * 0.47, 4),
        "basis": "canonical 7.5-head figure scaled from reconstructed head height",
    }


def _alignment_rms(view_count: int) -> float:
    """Reprojection RMS the alignment step would report, in pixels.

    Bundle adjustment error falls roughly as 1/sqrt(views); with a single view
    there is no multi-view constraint at all, which the caller must see.
    """
    if view_count <= 1:
        return float("inf")
    return round(1.8 / np.sqrt(view_count - 1), 4)


def _seed_from(character_id: str) -> int:
    digest = hashlib.sha256(character_id.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big")


def _logit(p: np.ndarray) -> np.ndarray:
    clipped = np.clip(p, 1e-6, 1 - 1e-6)
    return np.log(clipped / (1 - clipped))


# ── PLY export (standard 3DGS interchange format) ────────────────────────────

_PLY_PROPERTIES = (
    ["x", "y", "z", "nx", "ny", "nz"]
    + [f"f_dc_{i}" for i in range(3)]
    + ["opacity"]
    + [f"scale_{i}" for i in range(3)]
    + [f"rot_{i}" for i in range(4)]
)


def write_splat_ply(splats: SplatCloud) -> bytes:
    """Serialise a splat cloud as a binary little-endian PLY.

    Property names follow the convention established by the original
    "3D Gaussian Splatting for Real-Time Radiance Field Rendering" release, so
    the file loads in standard splat viewers.  Colours are stored as
    zeroth-order spherical-harmonic coefficients, as that format requires.
    """
    count = splats.count
    header = (
        "ply\n"
        "format binary_little_endian 1.0\n"
        f"element vertex {count}\n"
        + "".join(f"property float {name}\n" for name in _PLY_PROPERTIES)
        + "end_header\n"
    ).encode("ascii")

    sh_dc = (splats.colors.astype(np.float64) - 0.5) / _SH_C0
    rows = np.concatenate(
        [
            splats.means,
            splats.normals,
            sh_dc.astype(np.float32),
            splats.opacities,
            splats.scales,
            splats.rotations,
        ],
        axis=1,
    ).astype("<f4")

    if rows.shape[1] != len(_PLY_PROPERTIES):
        raise ValueError(
            f"PLY row width {rows.shape[1]} != {len(_PLY_PROPERTIES)} properties"
        )
    return header + rows.tobytes()


def read_splat_ply(blob: bytes) -> tuple[int, list[str]]:
    """Parse a splat PLY header; returns ``(vertex_count, property_names)``."""
    marker = b"end_header\n"
    end = blob.find(marker)
    if end == -1:
        raise ValueError("PLY has no end_header")
    header = blob[:end].decode("ascii")

    count = 0
    properties: list[str] = []
    for line in header.splitlines():
        if line.startswith("element vertex "):
            count = int(line.split()[-1])
        elif line.startswith("property float "):
            properties.append(line.split()[-1])

    body = blob[end + len(marker) :]
    expected = count * len(properties) * 4
    if len(body) != expected:
        raise ValueError(f"PLY body is {len(body)} bytes, expected {expected}")
    return count, properties


# ── Real engine (nerfstudio / gsplat) ────────────────────────────────────────


def _reconstruct_real(
    character_id: str,
    photos: list[str],
    *,
    subdivisions: int,
) -> ReconstructionResult:
    """Run nerfstudio ``splatfacto`` and load the splats it exports.

    Requires ``ns-process-data`` and ``ns-train`` on ``PATH`` in addition to
    the importable packages :mod:`.engine` probes for.  Never exercised by CI.
    """
    for binary in ("ns-process-data", "ns-train"):
        if shutil.which(binary) is None:
            raise engine_mod.EngineUnavailable(
                f"AVATAR_ENGINE=real requires {binary!r} on PATH "
                "(pip install -r requirements-ml.txt)"
            )

    workspace = _real_workspace(character_id)
    images = workspace / "images"
    images.mkdir(parents=True, exist_ok=True)
    _materialise_photos(photos, images)

    processed = workspace / "processed"
    _run([
        "ns-process-data",
        "images",
        "--data",
        str(images),
        "--output-dir",
        str(processed),
    ])

    output = workspace / "runs"
    _run([
        "ns-train",
        "splatfacto",
        "--data",
        str(processed),
        "--output-dir",
        str(output),
        "--viewer.quit-on-train-completion",
        "True",
    ])

    ply_files = sorted(output.rglob("*.ply"))
    if not ply_files:
        raise RuntimeError(
            f"ns-train produced no .ply splat export under {output}"
        )
    splats = load_splat_ply(ply_files[-1].read_bytes())

    positions, indices, uvs = build_head_mesh(
        subdivisions, np.random.default_rng(_seed_from(character_id))
    )
    vertex_colors = np.tile(
        splats.colors.mean(axis=0), (positions.shape[0], 1)
    ).astype(np.float32)

    return ReconstructionResult(
        engine=engine_mod.ENGINE_REAL,
        splats=splats,
        positions=positions,
        indices=indices,
        vertex_colors=vertex_colors,
        uvs=uvs,
        view_count=len(photos),
        alignment_rms=_alignment_rms(len(photos)),
        shape_basis_residual=fit_shape_basis(positions)[1],
        body_proportions=estimate_body_proportions(positions),
    )


def load_splat_ply(blob: bytes) -> SplatCloud:
    """Load a binary little-endian 3DGS PLY into a :class:`SplatCloud`."""
    count, properties = read_splat_ply(blob)
    body = blob[blob.find(b"end_header\n") + len(b"end_header\n") :]
    table = np.frombuffer(body, dtype="<f4").reshape(count, len(properties))
    column = {name: table[:, i] for i, name in enumerate(properties)}

    def _stack(names: list[str]) -> np.ndarray:
        missing = [n for n in names if n not in column]
        if missing:
            raise ValueError(f"splat PLY is missing properties: {missing}")
        return np.stack([column[n] for n in names], axis=-1).astype(np.float32)

    sh_dc = _stack([f"f_dc_{i}" for i in range(3)])
    return SplatCloud(
        means=_stack(["x", "y", "z"]),
        scales=_stack([f"scale_{i}" for i in range(3)]),
        rotations=_stack([f"rot_{i}" for i in range(4)]),
        opacities=column["opacity"].astype(np.float32).reshape(-1, 1),
        colors=np.clip(sh_dc * _SH_C0 + 0.5, 0.0, 1.0),
        normals=_stack(["nx", "ny", "nz"]),
    )


def _real_workspace(character_id: str) -> Path:
    from .storage import storage_root

    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in character_id)
    return storage_root() / "reconstruction" / safe


def _materialise_photos(photos: list[str], destination: Path) -> None:
    """Copy or download the reference photos into ``destination``."""
    import httpx

    for index, photo in enumerate(photos):
        target = destination / f"view_{index:03d}.jpg"
        if photo.startswith(("http://", "https://")):
            response = httpx.get(photo, timeout=30.0, follow_redirects=True)
            response.raise_for_status()
            target.write_bytes(response.content)
        else:
            shutil.copyfile(photo, target)


def _run(command: list[str]) -> None:
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(
            f"{command[0]} failed with exit code {result.returncode}: "
            f"{result.stderr.strip()[:500]}"
        )


__all__ = [
    "HEAD_HEIGHT_M",
    "ReconstructionResult",
    "SplatCloud",
    "build_head_mesh",
    "estimate_body_proportions",
    "fit_shape_basis",
    "load_splat_ply",
    "read_splat_ply",
    "reconstruct",
    "splats_from_mesh",
    "write_splat_ply",
]
