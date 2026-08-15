"""Tests for the glTF/GLB writer, the splat PLY writer and artifact storage.

The point of these is that the exports are real: the containers are re-parsed
and their contents checked against what went in.
"""

from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

_AI_API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_AI_API_ROOT))

import numpy as np
import pytest

from src.services.avatar.gltf import (
    CHUNK_TYPE_BIN,
    CHUNK_TYPE_JSON,
    GLB_MAGIC,
    Mesh,
    MorphTarget,
    compute_vertex_normals,
    read_glb,
    write_glb,
)
from src.services.avatar.reconstruction import (
    build_head_mesh,
    estimate_body_proportions,
    fit_shape_basis,
    load_splat_ply,
    read_splat_ply,
    splats_from_mesh,
    write_splat_ply,
)
from src.services.avatar.storage import store_artifact


@pytest.fixture()
def tetrahedron() -> Mesh:
    positions = np.array(
        [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]], dtype=np.float32
    )
    indices = np.array(
        [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]], dtype=np.uint32
    )
    return Mesh(positions=positions, indices=indices)


class TestNormals:
    def test_normals_are_unit_length(self, tetrahedron: Mesh) -> None:
        normals = compute_vertex_normals(tetrahedron.positions, tetrahedron.indices)
        lengths = np.linalg.norm(normals, axis=1)
        assert np.allclose(lengths, 1.0, atol=1e-5)

    def test_normals_are_finite(self) -> None:
        positions, indices, _ = build_head_mesh(16, np.random.default_rng(0))
        normals = compute_vertex_normals(positions, indices)
        assert np.isfinite(normals).all()

    def test_degenerate_vertex_gets_a_fallback_normal(self) -> None:
        positions = np.zeros((3, 3), dtype=np.float32)
        indices = np.array([[0, 1, 2]], dtype=np.uint32)
        normals = compute_vertex_normals(positions, indices)
        assert np.isfinite(normals).all()
        assert np.allclose(np.linalg.norm(normals, axis=1), 1.0)


class TestGlbContainer:
    def test_header_is_well_formed(self, tetrahedron: Mesh) -> None:
        blob = write_glb(tetrahedron, asset_name="t", generator="test")
        magic, version, length = struct.unpack("<III", blob[:12])
        assert magic == GLB_MAGIC
        assert version == 2
        assert length == len(blob)

    def test_total_length_is_four_byte_aligned(self, tetrahedron: Mesh) -> None:
        blob = write_glb(tetrahedron, asset_name="t", generator="test")
        assert len(blob) % 4 == 0

    def test_chunks_are_json_then_bin(self, tetrahedron: Mesh) -> None:
        blob = write_glb(tetrahedron, asset_name="t", generator="test")
        json_length, json_type = struct.unpack("<II", blob[12:20])
        assert json_type == CHUNK_TYPE_JSON
        _, bin_type = struct.unpack(
            "<II", blob[20 + json_length : 28 + json_length]
        )
        assert bin_type == CHUNK_TYPE_BIN

    def test_round_trips(self, tetrahedron: Mesh) -> None:
        blob = write_glb(tetrahedron, asset_name="hero", generator="animaforge")
        gltf, binary = read_glb(blob)

        assert gltf["asset"]["version"] == "2.0"
        assert gltf["asset"]["generator"] == "animaforge"
        assert gltf["meshes"][0]["name"] == "hero"
        assert len(binary) == gltf["buffers"][0]["byteLength"]

    def test_positions_survive_the_round_trip(self, tetrahedron: Mesh) -> None:
        blob = write_glb(tetrahedron, asset_name="t", generator="test")
        gltf, binary = read_glb(blob)

        accessor = gltf["accessors"][
            gltf["meshes"][0]["primitives"][0]["attributes"]["POSITION"]
        ]
        view = gltf["bufferViews"][accessor["bufferView"]]
        raw = binary[view["byteOffset"] : view["byteOffset"] + view["byteLength"]]
        decoded = np.frombuffer(raw, dtype="<f4").reshape(-1, 3)

        assert decoded.shape == tetrahedron.positions.shape
        assert np.allclose(decoded, tetrahedron.positions)

    def test_indices_survive_the_round_trip(self, tetrahedron: Mesh) -> None:
        blob = write_glb(tetrahedron, asset_name="t", generator="test")
        gltf, binary = read_glb(blob)

        accessor = gltf["accessors"][gltf["meshes"][0]["primitives"][0]["indices"]]
        view = gltf["bufferViews"][accessor["bufferView"]]
        raw = binary[view["byteOffset"] : view["byteOffset"] + view["byteLength"]]
        decoded = np.frombuffer(raw, dtype="<u4")

        assert np.array_equal(decoded, tetrahedron.indices.reshape(-1))

    def test_position_accessor_declares_min_and_max(self, tetrahedron: Mesh) -> None:
        """glTF requires min/max on POSITION accessors."""
        gltf, _ = read_glb(write_glb(tetrahedron, asset_name="t", generator="t"))
        accessor = gltf["accessors"][
            gltf["meshes"][0]["primitives"][0]["attributes"]["POSITION"]
        ]
        assert accessor["min"] == [0.0, 0.0, 0.0]
        assert accessor["max"] == [1.0, 1.0, 1.0]

    def test_buffer_views_stay_within_the_binary_chunk(
        self, tetrahedron: Mesh
    ) -> None:
        gltf, binary = read_glb(write_glb(tetrahedron, asset_name="t", generator="t"))
        for view in gltf["bufferViews"]:
            assert view["byteOffset"] + view["byteLength"] <= len(binary)

    def test_morph_targets_are_exported(self, tetrahedron: Mesh) -> None:
        deltas = np.full_like(tetrahedron.positions, 0.1)
        tetrahedron.morph_targets = [MorphTarget("jawOpen", deltas)]

        gltf, _ = read_glb(write_glb(tetrahedron, asset_name="t", generator="t"))
        primitive = gltf["meshes"][0]["primitives"][0]
        assert len(primitive["targets"]) == 1
        assert gltf["meshes"][0]["weights"] == [0.0]
        assert gltf["meshes"][0]["extras"]["targetNames"] == ["jawOpen"]

    def test_json_chunk_is_valid_json(self, tetrahedron: Mesh) -> None:
        blob = write_glb(tetrahedron, asset_name="t", generator="test")
        json_length = struct.unpack("<I", blob[12:16])[0]
        chunk = blob[20 : 20 + json_length]
        assert isinstance(json.loads(chunk.decode("utf-8")), dict)


class TestGlbValidation:
    def test_rejects_empty_mesh(self) -> None:
        mesh = Mesh(
            positions=np.zeros((0, 3), dtype=np.float32),
            indices=np.zeros((0, 3), dtype=np.uint32),
        )
        with pytest.raises(ValueError, match="no vertices"):
            write_glb(mesh, asset_name="t", generator="t")

    def test_rejects_out_of_range_index(self) -> None:
        mesh = Mesh(
            positions=np.zeros((3, 3), dtype=np.float32),
            indices=np.array([[0, 1, 9]], dtype=np.uint32),
        )
        with pytest.raises(ValueError, match="index out of range"):
            write_glb(mesh, asset_name="t", generator="t")

    def test_rejects_mismatched_morph_target(self, tetrahedron: Mesh) -> None:
        tetrahedron.morph_targets = [
            MorphTarget("bad", np.zeros((2, 3), dtype=np.float32))
        ]
        with pytest.raises(ValueError, match="must match positions shape"):
            write_glb(tetrahedron, asset_name="t", generator="t")

    def test_rejects_bad_magic(self) -> None:
        with pytest.raises(ValueError, match="bad magic"):
            read_glb(b"XXXX" + b"\x00" * 8)

    def test_rejects_truncated_container(self) -> None:
        with pytest.raises(ValueError, match="12-byte header"):
            read_glb(b"abc")


class TestHeadMesh:
    def test_mesh_is_closed(self) -> None:
        """A welded, capped UV grid must have no boundary edges."""
        _, indices, _ = build_head_mesh(24, np.random.default_rng(0))
        edges = np.concatenate(
            [indices[:, [0, 1]], indices[:, [1, 2]], indices[:, [2, 0]]], axis=0
        )
        _, counts = np.unique(np.sort(edges, axis=1), axis=0, return_counts=True)
        assert int(np.sum(counts == 1)) == 0
        assert int(np.sum(counts > 2)) == 0

    def test_head_is_taller_than_it_is_wide(self) -> None:
        positions, _, _ = build_head_mesh(32, np.random.default_rng(0))
        extent = positions.max(axis=0) - positions.min(axis=0)
        assert extent[1] > extent[0]

    def test_head_is_roughly_life_size(self) -> None:
        positions, _, _ = build_head_mesh(32, np.random.default_rng(0))
        height_mm = (positions[:, 1].max() - positions[:, 1].min()) * 1000
        assert 200 < height_mm < 250

    def test_uvs_are_in_unit_square(self) -> None:
        _, _, uvs = build_head_mesh(16, np.random.default_rng(0))
        assert uvs.min() >= 0.0
        assert uvs.max() <= 1.0

    def test_rejects_too_few_rings(self) -> None:
        with pytest.raises(ValueError, match="rings must be"):
            build_head_mesh(3, np.random.default_rng(0))

    def test_shape_basis_residual_is_bounded(self) -> None:
        positions, _, _ = build_head_mesh(24, np.random.default_rng(0))
        _, residual = fit_shape_basis(positions)
        assert 0.0 <= residual <= 1.0

    def test_body_proportions_are_plausible(self) -> None:
        positions, _, _ = build_head_mesh(24, np.random.default_rng(0))
        proportions = estimate_body_proportions(positions)
        assert 1.4 < proportions["estimated_stature_m"] < 2.1
        assert proportions["shoulder_width_m"] < proportions["estimated_stature_m"]


class TestSplatPly:
    @pytest.fixture()
    def splats(self):
        rng = np.random.default_rng(0)
        positions, indices, _ = build_head_mesh(16, rng)
        colors = np.full((positions.shape[0], 3), 0.6, dtype=np.float32)
        return splats_from_mesh(positions, indices, colors, rng)

    def test_writes_a_parseable_header(self, splats) -> None:
        count, properties = read_splat_ply(write_splat_ply(splats))
        assert count == splats.count
        assert len(properties) == 17

    def test_uses_standard_3dgs_property_names(self, splats) -> None:
        _, properties = read_splat_ply(write_splat_ply(splats))
        expected = (
            ["x", "y", "z", "nx", "ny", "nz"]
            + [f"f_dc_{i}" for i in range(3)]
            + ["opacity"]
            + [f"scale_{i}" for i in range(3)]
            + [f"rot_{i}" for i in range(4)]
        )
        assert properties == expected

    def test_body_length_matches_the_header(self, splats) -> None:
        blob = write_splat_ply(splats)
        count, properties = read_splat_ply(blob)
        body = blob[blob.find(b"end_header\n") + 11 :]
        assert len(body) == count * len(properties) * 4

    def test_positions_round_trip(self, splats) -> None:
        loaded = load_splat_ply(write_splat_ply(splats))
        assert np.allclose(loaded.means, splats.means, atol=1e-6)

    def test_colours_round_trip_through_sh(self, splats) -> None:
        """Colours are stored as SH DC coefficients and must decode back."""
        loaded = load_splat_ply(write_splat_ply(splats))
        assert np.allclose(loaded.colors, splats.colors, atol=1e-5)

    def test_rotations_are_unit_quaternions(self, splats) -> None:
        norms = np.linalg.norm(splats.rotations, axis=1)
        assert np.allclose(norms, 1.0, atol=1e-5)

    def test_rejects_truncated_body(self, splats) -> None:
        blob = write_splat_ply(splats)
        with pytest.raises(ValueError, match="expected"):
            read_splat_ply(blob[:-8])

    def test_rejects_missing_header(self) -> None:
        with pytest.raises(ValueError, match="end_header"):
            read_splat_ply(b"not a ply")


class TestStorage:
    def test_writes_the_bytes_it_was_given(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("AVATAR_STORAGE_DIR", str(tmp_path))
        monkeypatch.delenv("AVATAR_STORAGE_BASE_URL", raising=False)

        artifact = store_artifact("a/b/thing.bin", b"payload", "application/octet-stream")

        assert artifact.local_path is not None
        assert Path(artifact.local_path).read_bytes() == b"payload"
        assert artifact.size_bytes == 7
        assert artifact.url.startswith("file:///")

    def test_uses_the_configured_base_url(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("AVATAR_STORAGE_DIR", str(tmp_path))
        monkeypatch.setenv("AVATAR_STORAGE_BASE_URL", "https://cdn.example.test/av")

        artifact = store_artifact("c/d.bin", b"x", "application/octet-stream")
        assert artifact.url == "https://cdn.example.test/av/c/d.bin"

    def test_digest_matches_the_payload(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        import hashlib

        monkeypatch.setenv("AVATAR_STORAGE_DIR", str(tmp_path))
        artifact = store_artifact("e.bin", b"hello", "application/octet-stream")
        assert artifact.sha256 == hashlib.sha256(b"hello").hexdigest()

    def test_rejects_path_traversal(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("AVATAR_STORAGE_DIR", str(tmp_path))
        with pytest.raises(ValueError, match="traverse parents"):
            store_artifact("../escape.bin", b"x", "application/octet-stream")

    def test_rejects_empty_key(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("AVATAR_STORAGE_DIR", str(tmp_path))
        with pytest.raises(ValueError, match="must not be empty"):
            store_artifact("   ", b"x", "application/octet-stream")

    def test_unknown_backend_raises(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("AVATAR_STORAGE_DIR", str(tmp_path))
        monkeypatch.setenv("AVATAR_STORAGE_BACKEND", "gopher")
        with pytest.raises(RuntimeError, match="Unknown AVATAR_STORAGE_BACKEND"):
            store_artifact("f.bin", b"x", "application/octet-stream")

    def test_s3_without_bucket_raises_rather_than_faking_a_url(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("AVATAR_STORAGE_DIR", str(tmp_path))
        monkeypatch.setenv("AVATAR_STORAGE_BACKEND", "s3")
        monkeypatch.delenv("AVATAR_S3_BUCKET", raising=False)
        with pytest.raises(RuntimeError, match="AVATAR_S3_BUCKET"):
            store_artifact("g.bin", b"x", "application/octet-stream")
