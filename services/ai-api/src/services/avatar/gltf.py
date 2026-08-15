"""A real glTF 2.0 / GLB writer.

This produces spec-conformant binary glTF (``.glb``) containers: a 12-byte
header followed by a JSON chunk and a BIN chunk, each padded to a four-byte
boundary.  The output parses in any conformant loader; the round-trip test in
``tests/test_avatar_gltf.py`` re-reads the container it writes.

Only the subset the avatar pipeline needs is implemented: a single indexed
triangle mesh with positions, normals and optional morph targets
(blendshapes).  It intentionally has no third-party dependency beyond numpy so
that the export path works on a CPU-only CI runner.

Reference: glTF 2.0 specification, sections 3.6 (accessors) and 4 (GLB).
"""

from __future__ import annotations

import json
import struct
from dataclasses import dataclass, field

import numpy as np

GLB_MAGIC = 0x46546C67  # 'glTF'
GLB_VERSION = 2
CHUNK_TYPE_JSON = 0x4E4F534A  # 'JSON'
CHUNK_TYPE_BIN = 0x004E4942  # 'BIN\0'

_COMPONENT_TYPE_FLOAT = 5126
_COMPONENT_TYPE_UINT32 = 5125
_TARGET_ARRAY_BUFFER = 34962
_TARGET_ELEMENT_ARRAY_BUFFER = 34963


@dataclass
class MorphTarget:
    """A named blendshape expressed as per-vertex position deltas."""

    name: str
    position_deltas: np.ndarray


@dataclass
class Mesh:
    """An indexed triangle mesh destined for glTF export."""

    positions: np.ndarray  # (V, 3) float32
    indices: np.ndarray  # (T, 3) uint32
    normals: np.ndarray | None = None
    morph_targets: list[MorphTarget] = field(default_factory=list)

    @property
    def vertex_count(self) -> int:
        return int(self.positions.shape[0])

    @property
    def triangle_count(self) -> int:
        return int(self.indices.shape[0])

    def validate(self) -> None:
        """Raise ``ValueError`` if the mesh is not exportable."""
        if self.positions.ndim != 2 or self.positions.shape[1] != 3:
            raise ValueError("positions must have shape (V, 3)")
        if self.vertex_count == 0:
            raise ValueError("mesh has no vertices")
        if self.indices.ndim != 2 or self.indices.shape[1] != 3:
            raise ValueError("indices must have shape (T, 3)")
        if self.triangle_count == 0:
            raise ValueError("mesh has no triangles")
        if int(self.indices.max()) >= self.vertex_count:
            raise ValueError("index out of range for vertex count")
        if self.normals is not None and self.normals.shape != self.positions.shape:
            raise ValueError("normals must match positions shape")
        for target in self.morph_targets:
            if target.position_deltas.shape != self.positions.shape:
                raise ValueError(
                    f"morph target {target.name!r} must match positions shape"
                )


def compute_vertex_normals(positions: np.ndarray, indices: np.ndarray) -> np.ndarray:
    """Return area-weighted smooth vertex normals."""
    normals = np.zeros_like(positions, dtype=np.float32)
    tri = positions[indices]
    # Cross product of two triangle edges is the (area-scaled) face normal.
    face_normals = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    for corner in range(3):
        np.add.at(normals, indices[:, corner], face_normals)
    lengths = np.linalg.norm(normals, axis=1, keepdims=True)
    # Degenerate vertices keep a unit +Y normal rather than becoming NaN.
    safe = np.where(lengths > 1e-12, lengths, 1.0)
    normals = normals / safe
    normals[lengths[:, 0] <= 1e-12] = np.array([0.0, 1.0, 0.0], dtype=np.float32)
    return normals.astype(np.float32)


def write_glb(mesh: Mesh, *, asset_name: str, generator: str) -> bytes:
    """Serialise ``mesh`` as a binary glTF container and return its bytes."""
    mesh.validate()

    normals = (
        mesh.normals
        if mesh.normals is not None
        else compute_vertex_normals(mesh.positions, mesh.indices)
    )

    buffer_parts: list[bytes] = []
    buffer_views: list[dict[str, object]] = []
    accessors: list[dict[str, object]] = []
    offset = 0

    def _append(data: np.ndarray, target: int) -> int:
        nonlocal offset
        payload = np.ascontiguousarray(data).tobytes()
        padding = (-len(payload)) % 4
        buffer_parts.append(payload + b"\x00" * padding)
        buffer_views.append(
            {
                "buffer": 0,
                "byteOffset": offset,
                "byteLength": len(payload),
                "target": target,
            }
        )
        offset += len(payload) + padding
        return len(buffer_views) - 1

    def _add_vec3_accessor(data: np.ndarray, name: str) -> int:
        view = _append(data.astype(np.float32), _TARGET_ARRAY_BUFFER)
        accessors.append(
            {
                "bufferView": view,
                "componentType": _COMPONENT_TYPE_FLOAT,
                "count": int(data.shape[0]),
                "type": "VEC3",
                "min": [float(v) for v in data.min(axis=0)],
                "max": [float(v) for v in data.max(axis=0)],
                "name": name,
            }
        )
        return len(accessors) - 1

    position_accessor = _add_vec3_accessor(mesh.positions, "POSITION")
    normal_accessor = _add_vec3_accessor(normals, "NORMAL")

    flat_indices = mesh.indices.astype(np.uint32).reshape(-1)
    index_view = _append(flat_indices, _TARGET_ELEMENT_ARRAY_BUFFER)
    accessors.append(
        {
            "bufferView": index_view,
            "componentType": _COMPONENT_TYPE_UINT32,
            "count": int(flat_indices.size),
            "type": "SCALAR",
            "min": [int(flat_indices.min())],
            "max": [int(flat_indices.max())],
            "name": "indices",
        }
    )
    index_accessor = len(accessors) - 1

    targets: list[dict[str, int]] = []
    for target in mesh.morph_targets:
        targets.append(
            {"POSITION": _add_vec3_accessor(target.position_deltas, target.name)}
        )

    primitive: dict[str, object] = {
        "attributes": {"POSITION": position_accessor, "NORMAL": normal_accessor},
        "indices": index_accessor,
        "mode": 4,  # TRIANGLES
    }
    gltf_mesh: dict[str, object] = {"name": asset_name, "primitives": [primitive]}
    if targets:
        primitive["targets"] = targets
        gltf_mesh["weights"] = [0.0] * len(targets)
        gltf_mesh["extras"] = {
            "targetNames": [t.name for t in mesh.morph_targets],
        }

    binary_blob = b"".join(buffer_parts)
    gltf: dict[str, object] = {
        "asset": {"version": "2.0", "generator": generator},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": asset_name}],
        "meshes": [gltf_mesh],
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(binary_blob)}],
    }

    return _pack_glb(gltf, binary_blob)


def read_glb(blob: bytes) -> tuple[dict, bytes]:
    """Parse a GLB container and return ``(gltf_json, binary_chunk)``.

    Used by the export tests to prove the writer emits a readable container.
    """
    if len(blob) < 12:
        raise ValueError("GLB shorter than its 12-byte header")
    magic, version, total_length = struct.unpack("<III", blob[:12])
    if magic != GLB_MAGIC:
        raise ValueError("not a GLB container (bad magic)")
    if version != GLB_VERSION:
        raise ValueError(f"unsupported GLB version {version}")
    if total_length != len(blob):
        raise ValueError("GLB header length does not match payload size")

    gltf_json: dict | None = None
    binary_chunk = b""
    cursor = 12
    while cursor < len(blob):
        chunk_length, chunk_type = struct.unpack("<II", blob[cursor : cursor + 8])
        cursor += 8
        chunk = blob[cursor : cursor + chunk_length]
        cursor += chunk_length + (-chunk_length) % 4
        if chunk_type == CHUNK_TYPE_JSON:
            gltf_json = json.loads(chunk.decode("utf-8"))
        elif chunk_type == CHUNK_TYPE_BIN:
            binary_chunk = chunk

    if gltf_json is None:
        raise ValueError("GLB has no JSON chunk")
    return gltf_json, binary_chunk


def _pack_glb(gltf: dict[str, object], binary_blob: bytes) -> bytes:
    json_chunk = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    json_chunk += b" " * ((-len(json_chunk)) % 4)  # JSON chunk pads with spaces
    bin_chunk = binary_blob + b"\x00" * ((-len(binary_blob)) % 4)

    total = 12 + 8 + len(json_chunk) + (8 + len(bin_chunk) if bin_chunk else 0)
    out = bytearray()
    out += struct.pack("<III", GLB_MAGIC, GLB_VERSION, total)
    out += struct.pack("<II", len(json_chunk), CHUNK_TYPE_JSON)
    out += json_chunk
    if bin_chunk:
        out += struct.pack("<II", len(bin_chunk), CHUNK_TYPE_BIN)
        out += bin_chunk
    return bytes(out)
