"""Real parsers for the C3D and TRC motion-capture formats.

Unlike the BVH and FBX handlers in :mod:`.mocap_service`, which synthesise a
skeleton, these two read actual file bytes:

* **TRC** (Motion Analysis / OpenSim) is a tab-delimited text format: a
  ``PathFileType`` line, a header key/value pair of lines, two marker-name
  lines and then one row per frame.
* **C3D** (Biomechanics-ADTech) is binary.  This reads the 512-byte header
  record for the point count, frame range, scale factor, data offset and
  frame rate, walks the parameter section for ``POINT:LABELS``, and decodes
  the 3D point block in either its 16-bit scaled-integer or 32-bit float
  representation.

Both produce the motion dictionary shape the rest of the mocap service uses.

Limits, stated rather than hidden:

* C3D files written by DEC or MIPS processors are rejected with a clear
  error.  Their float encoding and byte order differ, and misreading them
  would yield plausible-looking but wrong coordinates.
* Analog channels are skipped over, not decoded.  Only 3D point data is
  returned.
* Markers are returned as a flat marker set. Neither format carries a joint
  hierarchy, so no parent relationships are invented.
"""

from __future__ import annotations

import struct
import uuid
from typing import Any

#: C3D header key byte confirming the second word of the header record.
_C3D_KEY = 0x50

#: Processor-type codes stored in the parameter section header.
_PROCESSOR_INTEL = 84
_PROCESSOR_DEC = 85
_PROCESSOR_MIPS = 86

_PROCESSOR_NAMES = {
    _PROCESSOR_INTEL: "Intel",
    _PROCESSOR_DEC: "DEC",
    _PROCESSOR_MIPS: "MIPS",
}


def parse_trc_bytes(data: bytes) -> dict[str, Any]:
    """Parse a TRC file into the shared motion dictionary shape.

    Raises:
        ValueError: if the file is not a TRC or its header is inconsistent.
    """
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError(f"TRC file is not valid UTF-8 text: {exc}") from exc

    lines = text.splitlines()
    if len(lines) < 6:
        raise ValueError("TRC file is too short to contain a header")
    if not lines[0].startswith("PathFileType"):
        raise ValueError("TRC file must start with a PathFileType line")

    keys = lines[1].split("\t")
    values = lines[2].split("\t")
    header = {
        key.strip(): value.strip()
        for key, value in zip(keys, values)
        if key.strip()
    }

    fps = _require_float(header, "DataRate")
    marker_count = int(_require_float(header, "NumMarkers"))
    declared_frames = int(_require_float(header, "NumFrames"))
    units = header.get("Units", "mm")

    if fps <= 0:
        raise ValueError(f"TRC DataRate must be positive, got {fps}")
    if marker_count <= 0:
        raise ValueError(f"TRC NumMarkers must be positive, got {marker_count}")

    marker_names = _trc_marker_names(lines[3], marker_count)
    scale = 0.001 if units.lower() == "mm" else 1.0

    frames: list[list[tuple[float, float, float] | None]] = []
    for line in lines[5:]:
        if not line.strip():
            continue
        fields = line.split("\t")
        if len(fields) < 2 + marker_count * 3:
            # Trailing partial rows are common in hand-edited files.
            continue
        coordinates = fields[2 : 2 + marker_count * 3]
        frames.append(_trc_frame(coordinates, marker_count, scale))

    if not frames:
        raise ValueError("TRC file contains no complete data rows")

    return _build_motion(
        fmt="trc",
        marker_names=marker_names,
        frames=frames,
        fps=fps,
        extra={
            "units": units,
            "declared_frame_count": declared_frames,
            "source_header": header,
        },
    )


def parse_c3d_bytes(data: bytes) -> dict[str, Any]:
    """Parse a C3D file into the shared motion dictionary shape.

    Raises:
        ValueError: if the file is malformed, truncated, or was written by a
            non-Intel processor whose encoding this reader does not decode.
    """
    if len(data) < 512:
        raise ValueError("C3D file is shorter than its 512-byte header record")
    if data[1] != _C3D_KEY:
        raise ValueError(
            f"C3D header key byte is 0x{data[1]:02X}, expected 0x{_C3D_KEY:02X}"
        )

    parameter_block = data[0]
    (
        point_count,
        analog_per_frame,
        first_frame,
        last_frame,
    ) = struct.unpack_from("<4H", data, 2)
    scale = struct.unpack_from("<f", data, 12)[0]
    data_block = struct.unpack_from("<H", data, 16)[0]
    analog_samples = struct.unpack_from("<H", data, 18)[0]
    frame_rate = struct.unpack_from("<f", data, 20)[0]

    processor = _c3d_processor(data, parameter_block)
    if processor != _PROCESSOR_INTEL:
        raise ValueError(
            f"C3D file uses {_PROCESSOR_NAMES.get(processor, processor)} "
            "encoding; this reader decodes Intel (little-endian) files only"
        )

    if point_count == 0:
        raise ValueError("C3D file declares zero 3D points")
    if frame_rate <= 0:
        raise ValueError(f"C3D frame rate must be positive, got {frame_rate}")
    if last_frame < first_frame:
        raise ValueError(
            f"C3D frame range is inverted: {first_frame}..{last_frame}"
        )
    if data_block < 1:
        raise ValueError("C3D data start block must be >= 1")

    frame_count = last_frame - first_frame + 1
    is_float = scale < 0
    item_size = 4 if is_float else 2
    point_scale = abs(scale) if not is_float else 1.0

    # Analog values are interleaved after each frame's point block.
    analog_values = analog_per_frame * max(analog_samples, 1) if analog_per_frame else 0
    frame_bytes = (point_count * 4 + analog_values) * item_size
    offset = (data_block - 1) * 512

    required = offset + frame_bytes * frame_count
    if required > len(data):
        raise ValueError(
            f"C3D file is truncated: {frame_count} frames need {required} "
            f"bytes but the file is {len(data)}"
        )

    marker_names = _c3d_labels(data, parameter_block, point_count)

    frames: list[list[tuple[float, float, float] | None]] = []
    for index in range(frame_count):
        base = offset + index * frame_bytes
        frames.append(
            _c3d_frame(data, base, point_count, is_float, point_scale)
        )

    return _build_motion(
        fmt="c3d",
        marker_names=marker_names,
        frames=frames,
        fps=float(frame_rate),
        # C3D point units are millimetres by convention.
        extra={
            "units": "mm",
            "first_frame": first_frame,
            "last_frame": last_frame,
            "encoding": "float32" if is_float else "int16",
            "analog_channels": analog_per_frame,
        },
    )


# ── Internals: TRC ───────────────────────────────────────────────────────────


def _require_float(header: dict[str, str], key: str) -> float:
    if key not in header:
        raise ValueError(f"TRC header is missing {key}")
    try:
        return float(header[key])
    except ValueError as exc:
        raise ValueError(f"TRC header {key} is not numeric: {header[key]!r}") from exc


def _trc_marker_names(line: str, marker_count: int) -> list[str]:
    """Extract marker names from the ``Frame#  Time  M1  M2 ...`` line."""
    fields = [field.strip() for field in line.split("\t")]
    names = [field for field in fields[2:] if field]
    if len(names) < marker_count:
        names += [f"Marker{i + 1:03d}" for i in range(len(names), marker_count)]
    return names[:marker_count]


def _trc_frame(
    coordinates: list[str],
    marker_count: int,
    scale: float,
) -> list[tuple[float, float, float] | None]:
    """Read one TRC row; blank triples mean an occluded marker."""
    positions: list[tuple[float, float, float] | None] = []
    for marker in range(marker_count):
        triple = coordinates[marker * 3 : marker * 3 + 3]
        if any(value.strip() == "" for value in triple):
            positions.append(None)
            continue
        try:
            x, y, z = (float(value) * scale for value in triple)
        except ValueError:
            positions.append(None)
            continue
        positions.append((x, y, z))
    return positions


# ── Internals: C3D ───────────────────────────────────────────────────────────


def _c3d_processor(data: bytes, parameter_block: int) -> int:
    """Read the processor-type byte from the parameter section header."""
    offset = (parameter_block - 1) * 512
    if offset + 4 > len(data):
        raise ValueError("C3D parameter section is outside the file")
    return data[offset + 3]


def _c3d_frame(
    data: bytes,
    base: int,
    point_count: int,
    is_float: bool,
    point_scale: float,
) -> list[tuple[float, float, float] | None]:
    """Decode one frame of 3D points.

    A negative residual marks an invalid (occluded) point, per the C3D spec.
    """
    positions: list[tuple[float, float, float] | None] = []
    if is_float:
        values = struct.unpack_from(f"<{point_count * 4}f", data, base)
        for index in range(point_count):
            x, y, z, residual = values[index * 4 : index * 4 + 4]
            positions.append(
                None if residual < 0 else (x * 0.001, y * 0.001, z * 0.001)
            )
    else:
        values = struct.unpack_from(f"<{point_count * 4}h", data, base)
        for index in range(point_count):
            x, y, z, residual = values[index * 4 : index * 4 + 4]
            if residual < 0:
                positions.append(None)
                continue
            positions.append(
                (
                    x * point_scale * 0.001,
                    y * point_scale * 0.001,
                    z * point_scale * 0.001,
                )
            )
    return positions


def _c3d_labels(data: bytes, parameter_block: int, point_count: int) -> list[str]:
    """Read ``POINT:LABELS`` from the parameter section.

    Falls back to generated names if the parameter is absent or malformed —
    a missing label block is not a reason to reject an otherwise valid file.
    """
    fallback = [f"Marker{i + 1:03d}" for i in range(point_count)]
    try:
        labels = _read_point_labels(data, parameter_block)
    except (ValueError, struct.error, IndexError):
        return fallback

    if not labels:
        return fallback
    if len(labels) < point_count:
        labels += fallback[len(labels) :]
    return labels[:point_count]


def _read_point_labels(data: bytes, parameter_block: int) -> list[str]:
    """Walk the parameter section looking for the POINT group's LABELS."""
    start = (parameter_block - 1) * 512
    cursor = start + 4  # skip reserved bytes, block count and processor type

    point_group_id: int | None = None
    pending: list[tuple[int, str, list[str]]] = []

    while cursor + 2 <= len(data):
        name_length = struct.unpack_from("<b", data, cursor)[0]
        group_id = struct.unpack_from("<b", data, cursor + 1)[0]
        if name_length == 0 and group_id == 0:
            break

        cursor += 2
        chars = abs(name_length)
        name = data[cursor : cursor + chars].decode("ascii", "replace").strip()
        cursor += chars

        next_offset = struct.unpack_from("<h", data, cursor)[0]
        item_end = cursor + next_offset if next_offset else 0
        cursor += 2

        if group_id < 0:
            if name.upper() == "POINT":
                point_group_id = -group_id
        else:
            values = _read_char_parameter(data, cursor)
            if values is not None:
                pending.append((group_id, name.upper(), values))

        if item_end <= 0 or item_end <= cursor - 2:
            break
        cursor = item_end

    if point_group_id is None:
        return []
    for group_id, name, values in pending:
        if group_id == point_group_id and name == "LABELS":
            return values
    return []


def _read_char_parameter(data: bytes, cursor: int) -> list[str] | None:
    """Decode a 2-dimensional character parameter, or None if it is not one."""
    data_type = struct.unpack_from("<b", data, cursor)[0]
    dimensions = struct.unpack_from("<B", data, cursor + 1)[0]
    if data_type != -1 or dimensions != 2:
        return None

    width, count = data[cursor + 2], data[cursor + 3]
    body = cursor + 4
    if width == 0 or count == 0:
        return []
    if body + width * count > len(data):
        raise ValueError("character parameter runs past the end of the file")

    return [
        data[body + i * width : body + (i + 1) * width]
        .decode("ascii", "replace")
        .strip()
        for i in range(count)
    ]


# ── Shared output shape ──────────────────────────────────────────────────────


def _build_motion(
    *,
    fmt: str,
    marker_names: list[str],
    frames: list[list[tuple[float, float, float] | None]],
    fps: float,
    extra: dict[str, Any],
) -> dict[str, Any]:
    """Assemble the motion dictionary the mocap service passes around."""
    frame_count = len(frames)
    duration_ms = round(frame_count / fps * 1000) if fps > 0 else 0

    joints = [
        # Marker sets are flat: neither format encodes a parent relationship.
        {"name": name, "parent": None, "index": index}
        for index, name in enumerate(marker_names)
    ]

    keyframes = [
        {
            "frame": index,
            "time_ms": round(index / fps * 1000) if fps > 0 else 0,
            "joint_transforms": {
                marker_names[marker]: {
                    "position": list(position),
                }
                for marker, position in enumerate(frame)
                if position is not None
            },
        }
        for index, frame in enumerate(frames)
    ]

    occluded = sum(
        1 for frame in frames for position in frame if position is None
    )

    return {
        "motion_id": f"mocap-{uuid.uuid4().hex[:12]}",
        "format": fmt,
        "joint_count": len(joints),
        "frame_count": frame_count,
        "fps": float(fps),
        "duration_ms": duration_ms,
        "joints": joints,
        "keyframes": keyframes,
        "marker_set": marker_names,
        "occluded_samples": occluded,
        "positions_are_metres": True,
        **extra,
    }
