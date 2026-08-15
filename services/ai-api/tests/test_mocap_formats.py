"""Tests for the real C3D and TRC motion-capture parsers.

Fixtures are built byte-for-byte in-test rather than checked in, so the tests
document the formats as well as exercise them.
"""

from __future__ import annotations

import struct
import sys
from pathlib import Path

_AI_API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_AI_API_ROOT))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.mocap import router
from src.services.mocap_formats import parse_c3d_bytes, parse_trc_bytes
from src.services.mocap_service import (
    FORMAT_SUPPORT,
    SUPPORTED_FORMATS,
    fetch_motion_bytes,
    parse_trc,
    validate_motion_data,
)


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


# ── Fixture builders ─────────────────────────────────────────────────────────


def build_trc(
    *,
    markers: list[str],
    frames: list[list[tuple[float, float, float]]],
    fps: float = 100.0,
    units: str = "mm",
) -> bytes:
    """Build a spec-shaped TRC file."""
    header_keys = (
        "DataRate\tCameraRate\tNumFrames\tNumMarkers\tUnits\t"
        "OrigDataRate\tOrigDataStartFrame\tOrigNumFrames"
    )
    header_values = (
        f"{fps}\t{fps}\t{len(frames)}\t{len(markers)}\t{units}\t{fps}\t1\t{len(frames)}"
    )

    marker_line = "Frame#\tTime\t" + "\t\t\t".join(markers)
    axis_line = "\t\t" + "\t".join(
        f"{axis}{i + 1}" for i in range(len(markers)) for axis in "XYZ"
    )

    lines = [
        "PathFileType\t4\t(X/Y/Z)\tfixture.trc",
        header_keys,
        header_values,
        marker_line,
        axis_line,
        "",
    ]
    for index, frame in enumerate(frames):
        row = [str(index + 1), f"{index / fps:.6f}"]
        for x, y, z in frame:
            row += [f"{x:.5f}", f"{y:.5f}", f"{z:.5f}"]
        lines.append("\t".join(row))

    return ("\n".join(lines) + "\n").encode("utf-8")


def build_c3d(
    *,
    point_count: int,
    frames: list[list[tuple[float, float, float]]],
    frame_rate: float = 200.0,
    as_float: bool = True,
    labels: list[str] | None = None,
    scale: float = 0.1,
) -> bytes:
    """Build a minimal but spec-conformant Intel-encoded C3D file."""
    parameter_block = 2
    data_block = 3

    header = bytearray(512)
    header[0] = parameter_block
    header[1] = 0x50
    struct.pack_into("<4H", header, 2, point_count, 0, 1, len(frames))
    struct.pack_into("<f", header, 12, -abs(scale) if as_float else abs(scale))
    struct.pack_into("<H", header, 16, data_block)
    struct.pack_into("<H", header, 18, 0)
    struct.pack_into("<f", header, 20, frame_rate)

    parameters = bytearray(512)
    parameters[0] = 1  # first parameter block
    parameters[1] = 0
    parameters[2] = 1  # parameter block count
    parameters[3] = 84  # Intel

    if labels:
        cursor = 4
        # POINT group definition (negative id).
        cursor = _write_group(parameters, cursor, name="POINT", group_id=-1)
        _write_labels(parameters, cursor, group_id=1, labels=labels)

    body = bytearray()
    for frame in frames:
        for index in range(point_count):
            x, y, z = frame[index] if index < len(frame) else (0.0, 0.0, 0.0)
            if as_float:
                body += struct.pack("<4f", x, y, z, 0.0)
            else:
                body += struct.pack(
                    "<4h",
                    round(x / scale),
                    round(y / scale),
                    round(z / scale),
                    0,
                )

    return bytes(header) + bytes(parameters) + bytes(body)


def _write_group(buffer: bytearray, cursor: int, *, name: str, group_id: int) -> int:
    buffer[cursor] = len(name)
    struct.pack_into("<b", buffer, cursor + 1, group_id)
    cursor += 2
    buffer[cursor : cursor + len(name)] = name.encode("ascii")
    cursor += len(name)
    # Offset to the next item, measured from this field, plus a 0-length
    # description byte.
    struct.pack_into("<h", buffer, cursor, 3)
    cursor += 2
    buffer[cursor] = 0  # description length
    return cursor + 1


def _write_labels(
    buffer: bytearray, cursor: int, *, group_id: int, labels: list[str]
) -> int:
    name = "LABELS"
    width = max(len(label) for label in labels)

    buffer[cursor] = len(name)
    struct.pack_into("<b", buffer, cursor + 1, group_id)
    cursor += 2
    buffer[cursor : cursor + len(name)] = name.encode("ascii")
    cursor += len(name)

    payload = bytearray()
    payload += struct.pack("<bB", -1, 2)  # char type, 2 dimensions
    payload += bytes([width, len(labels)])
    for label in labels:
        payload += label.encode("ascii").ljust(width)
    payload += b"\x00"  # description length

    struct.pack_into("<h", buffer, cursor, 2 + len(payload))
    cursor += 2
    buffer[cursor : cursor + len(payload)] = payload
    return cursor + len(payload)


SIMPLE_FRAMES = [
    [(10.0, 20.0, 30.0), (40.0, 50.0, 60.0)],
    [(11.0, 21.0, 31.0), (41.0, 51.0, 61.0)],
    [(12.0, 22.0, 32.0), (42.0, 52.0, 62.0)],
]


# ── TRC ──────────────────────────────────────────────────────────────────────


class TestTrcParser:
    def test_reads_header_fields(self) -> None:
        motion = parse_trc_bytes(
            build_trc(markers=["LASI", "RASI"], frames=SIMPLE_FRAMES, fps=100.0)
        )
        assert motion["format"] == "trc"
        assert motion["fps"] == 100.0
        assert motion["frame_count"] == 3
        assert motion["joint_count"] == 2
        assert motion["duration_ms"] == 30

    def test_reads_marker_names(self) -> None:
        motion = parse_trc_bytes(
            build_trc(markers=["LASI", "RASI"], frames=SIMPLE_FRAMES)
        )
        assert motion["marker_set"] == ["LASI", "RASI"]
        assert [j["name"] for j in motion["joints"]] == ["LASI", "RASI"]

    def test_converts_millimetres_to_metres(self) -> None:
        motion = parse_trc_bytes(
            build_trc(markers=["LASI", "RASI"], frames=SIMPLE_FRAMES, units="mm")
        )
        position = motion["keyframes"][0]["joint_transforms"]["LASI"]["position"]
        assert position == pytest.approx([0.010, 0.020, 0.030])

    def test_respects_metre_units(self) -> None:
        motion = parse_trc_bytes(
            build_trc(markers=["LASI", "RASI"], frames=SIMPLE_FRAMES, units="m")
        )
        position = motion["keyframes"][0]["joint_transforms"]["LASI"]["position"]
        assert position == pytest.approx([10.0, 20.0, 30.0])

    def test_frames_are_distinct(self) -> None:
        motion = parse_trc_bytes(
            build_trc(markers=["LASI", "RASI"], frames=SIMPLE_FRAMES)
        )
        first = motion["keyframes"][0]["joint_transforms"]["LASI"]["position"]
        last = motion["keyframes"][2]["joint_transforms"]["LASI"]["position"]
        assert first != last

    def test_occluded_markers_are_dropped(self) -> None:
        blob = build_trc(markers=["A", "B"], frames=SIMPLE_FRAMES)
        text = blob.decode("utf-8").splitlines()
        fields = text[6].split("\t")
        fields[2] = ""  # blank the first marker's X on frame 1
        text[6] = "\t".join(fields)
        motion = parse_trc_bytes(("\n".join(text) + "\n").encode("utf-8"))

        assert "A" not in motion["keyframes"][0]["joint_transforms"]
        assert "B" in motion["keyframes"][0]["joint_transforms"]
        assert motion["occluded_samples"] == 1

    def test_output_passes_motion_validation(self) -> None:
        motion = parse_trc_bytes(
            build_trc(markers=["A", "B"], frames=SIMPLE_FRAMES)
        )
        assert validate_motion_data(motion)["valid"] is True

    def test_rejects_missing_path_file_type(self) -> None:
        with pytest.raises(ValueError, match="PathFileType"):
            parse_trc_bytes(b"nope\n" * 8)

    def test_rejects_short_file(self) -> None:
        with pytest.raises(ValueError, match="too short"):
            parse_trc_bytes(b"PathFileType\n")

    def test_rejects_missing_data_rate(self) -> None:
        blob = build_trc(markers=["A"], frames=[[(1.0, 2.0, 3.0)]])
        broken = blob.replace(b"DataRate", b"SomeRate", 1)
        with pytest.raises(ValueError, match="missing DataRate"):
            parse_trc_bytes(broken)

    def test_rejects_non_numeric_data_rate(self) -> None:
        blob = build_trc(markers=["A"], frames=[[(1.0, 2.0, 3.0)]])
        broken = blob.replace(b"100.0\t100.0", b"fast\t100.0", 1)
        with pytest.raises(ValueError, match="not numeric"):
            parse_trc_bytes(broken)

    def test_rejects_file_with_no_rows(self) -> None:
        blob = build_trc(markers=["A"], frames=[])
        with pytest.raises(ValueError, match="no complete data rows"):
            parse_trc_bytes(blob)


# ── C3D ──────────────────────────────────────────────────────────────────────


class TestC3dParser:
    def test_reads_float_encoded_points(self) -> None:
        motion = parse_c3d_bytes(build_c3d(point_count=2, frames=SIMPLE_FRAMES))
        assert motion["format"] == "c3d"
        assert motion["encoding"] == "float32"
        assert motion["frame_count"] == 3
        assert motion["joint_count"] == 2

    def test_reads_integer_encoded_points(self) -> None:
        motion = parse_c3d_bytes(
            build_c3d(point_count=2, frames=SIMPLE_FRAMES, as_float=False, scale=0.1)
        )
        assert motion["encoding"] == "int16"
        position = motion["keyframes"][0]["joint_transforms"]["Marker001"]["position"]
        assert position == pytest.approx([0.010, 0.020, 0.030], abs=1e-6)

    def test_applies_the_scale_factor(self) -> None:
        coarse = parse_c3d_bytes(
            build_c3d(point_count=1, frames=[[(100.0, 0.0, 0.0)]], as_float=False, scale=1.0)
        )
        position = coarse["keyframes"][0]["joint_transforms"]["Marker001"]["position"]
        assert position[0] == pytest.approx(0.1)

    def test_reads_frame_rate(self) -> None:
        motion = parse_c3d_bytes(
            build_c3d(point_count=2, frames=SIMPLE_FRAMES, frame_rate=240.0)
        )
        assert motion["fps"] == pytest.approx(240.0)

    def test_reads_point_labels(self) -> None:
        motion = parse_c3d_bytes(
            build_c3d(
                point_count=2,
                frames=SIMPLE_FRAMES,
                labels=["LASI", "RASI"],
            )
        )
        assert motion["marker_set"] == ["LASI", "RASI"]

    def test_generates_labels_when_absent(self) -> None:
        motion = parse_c3d_bytes(build_c3d(point_count=2, frames=SIMPLE_FRAMES))
        assert motion["marker_set"] == ["Marker001", "Marker002"]

    def test_negative_residual_marks_occlusion(self) -> None:
        blob = bytearray(build_c3d(point_count=1, frames=[[(1.0, 2.0, 3.0)]]))
        # Overwrite the residual word of the first point with -1.
        struct.pack_into("<f", blob, 512 * 2 + 12, -1.0)
        motion = parse_c3d_bytes(bytes(blob))
        assert motion["keyframes"][0]["joint_transforms"] == {}
        assert motion["occluded_samples"] == 1

    def test_output_passes_motion_validation(self) -> None:
        motion = parse_c3d_bytes(build_c3d(point_count=2, frames=SIMPLE_FRAMES))
        assert validate_motion_data(motion)["valid"] is True

    def test_rejects_short_file(self) -> None:
        with pytest.raises(ValueError, match="512-byte header"):
            parse_c3d_bytes(b"\x02\x50")

    def test_rejects_bad_key_byte(self) -> None:
        blob = bytearray(build_c3d(point_count=1, frames=[[(1.0, 2.0, 3.0)]]))
        blob[1] = 0x41
        with pytest.raises(ValueError, match="header key byte"):
            parse_c3d_bytes(bytes(blob))

    def test_rejects_dec_encoding(self) -> None:
        blob = bytearray(build_c3d(point_count=1, frames=[[(1.0, 2.0, 3.0)]]))
        blob[512 + 3] = 85  # DEC
        with pytest.raises(ValueError, match="DEC"):
            parse_c3d_bytes(bytes(blob))

    def test_rejects_mips_encoding(self) -> None:
        blob = bytearray(build_c3d(point_count=1, frames=[[(1.0, 2.0, 3.0)]]))
        blob[512 + 3] = 86  # MIPS
        with pytest.raises(ValueError, match="MIPS"):
            parse_c3d_bytes(bytes(blob))

    def test_rejects_truncated_point_block(self) -> None:
        blob = build_c3d(point_count=2, frames=SIMPLE_FRAMES)
        with pytest.raises(ValueError, match="truncated"):
            parse_c3d_bytes(blob[:-16])

    def test_rejects_zero_points(self) -> None:
        blob = bytearray(build_c3d(point_count=1, frames=[[(1.0, 2.0, 3.0)]]))
        struct.pack_into("<H", blob, 2, 0)
        with pytest.raises(ValueError, match="zero 3D points"):
            parse_c3d_bytes(bytes(blob))

    def test_rejects_inverted_frame_range(self) -> None:
        blob = bytearray(build_c3d(point_count=1, frames=[[(1.0, 2.0, 3.0)]]))
        struct.pack_into("<H", blob, 6, 9)  # first frame after last
        with pytest.raises(ValueError, match="inverted"):
            parse_c3d_bytes(bytes(blob))


# ── Fetching and the upload route ────────────────────────────────────────────


class TestFetching:
    def test_reads_a_local_path(self, tmp_path: Path) -> None:
        target = tmp_path / "take.trc"
        target.write_bytes(build_trc(markers=["A"], frames=[[(1.0, 2.0, 3.0)]]))
        assert fetch_motion_bytes(str(target)).startswith(b"PathFileType")

    def test_reads_a_file_url(self, tmp_path: Path) -> None:
        target = tmp_path / "take.trc"
        target.write_bytes(build_trc(markers=["A"], frames=[[(1.0, 2.0, 3.0)]]))
        assert fetch_motion_bytes(target.as_uri()).startswith(b"PathFileType")

    def test_missing_file_raises(self, tmp_path: Path) -> None:
        with pytest.raises(ValueError, match="Could not read"):
            fetch_motion_bytes(str(tmp_path / "absent.trc"))

    def test_empty_file_raises(self, tmp_path: Path) -> None:
        target = tmp_path / "empty.trc"
        target.write_bytes(b"")
        with pytest.raises(ValueError, match="empty"):
            fetch_motion_bytes(str(target))

    def test_extension_is_enforced(self, tmp_path: Path) -> None:
        target = tmp_path / "take.bvh"
        target.write_bytes(b"x")
        with pytest.raises(ValueError, match="Expected .trc"):
            parse_trc(str(target))


class TestUploadRoute:
    def test_uploads_a_real_trc(self, client: TestClient, tmp_path: Path) -> None:
        target = tmp_path / "walk.trc"
        target.write_bytes(build_trc(markers=["LASI", "RASI"], frames=SIMPLE_FRAMES))

        resp = client.post(
            "/ai/v1/mocap/upload",
            json={"file_url": str(target), "format": "trc"},
        )
        assert resp.status_code == 200
        stats = resp.json()["stats"]
        assert stats["joint_count"] == 2
        assert stats["frame_count"] == 3
        assert stats["parsed_from_file"] is True

    def test_uploads_a_real_c3d(self, client: TestClient, tmp_path: Path) -> None:
        target = tmp_path / "walk.c3d"
        target.write_bytes(
            build_c3d(point_count=2, frames=SIMPLE_FRAMES, labels=["LASI", "RASI"])
        )

        resp = client.post(
            "/ai/v1/mocap/upload",
            json={"file_url": str(target), "format": "c3d"},
        )
        assert resp.status_code == 200
        assert resp.json()["stats"]["parsed_from_file"] is True

    def test_c3d_no_longer_returns_501(
        self, client: TestClient, tmp_path: Path
    ) -> None:
        target = tmp_path / "walk.c3d"
        target.write_bytes(build_c3d(point_count=1, frames=[[(1.0, 2.0, 3.0)]]))
        resp = client.post(
            "/ai/v1/mocap/upload",
            json={"file_url": str(target), "format": "c3d"},
        )
        assert resp.status_code != 501

    def test_malformed_c3d_is_a_400(self, client: TestClient, tmp_path: Path) -> None:
        target = tmp_path / "bad.c3d"
        target.write_bytes(b"\x02\x41" + b"\x00" * 600)
        resp = client.post(
            "/ai/v1/mocap/upload",
            json={"file_url": str(target), "format": "c3d"},
        )
        assert resp.status_code == 400
        assert "header key byte" in resp.json()["detail"]

    def test_bvh_still_works(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/mocap/upload",
            json={"file_url": "https://example.com/take.bvh", "format": "bvh"},
        )
        assert resp.status_code == 200
        # ...and is honest that the file was not actually read.
        assert resp.json()["stats"]["parsed_from_file"] is False

    def test_unsupported_format_is_400(self, client: TestClient) -> None:
        resp = client.post(
            "/ai/v1/mocap/upload",
            json={"file_url": "https://example.com/take.xyz", "format": "xyz"},
        )
        assert resp.status_code == 400

    def test_formats_endpoint_declares_support(self, client: TestClient) -> None:
        data = client.get("/ai/v1/mocap/formats").json()
        assert data["formats"] == SUPPORTED_FORMATS
        assert data["support"]["c3d"]["parsed"] is True
        assert data["support"]["trc"]["parsed"] is True
        assert data["support"]["bvh"]["parsed"] is False
        assert data["support"]["fbx"]["parsed"] is False

    def test_support_table_covers_every_format(self) -> None:
        assert set(FORMAT_SUPPORT) == set(SUPPORTED_FORMATS)
