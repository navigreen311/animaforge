"""3D scene graph spatial reasoning engine -- layout, occlusion, camera, lighting."""

from __future__ import annotations

import math
import uuid
from typing import Any

# -- Constants ----------------------------------------------------------------

_DEFAULT_NEAR = 0.1
_DEFAULT_FAR = 1000.0
_DEFAULT_ASPECT = 16 / 9
_RULE_OF_THIRDS_TOLERANCE = 0.1
_MIN_HEADROOM = 0.05
_MAX_HEADROOM = 0.25
_MIN_LEAD_ROOM = 0.1

_STYLE_PRESETS: dict[str, dict[str, Any]] = {
    "cinematic": {
        "focal_lengths": [35, 50, 85],
        "height_bias": 1.2,
        "angle_bias": 15,
        "rationale": "Classic cinematic framing with shallow DOF emphasis",
    },
    "documentary": {
        "focal_lengths": [24, 35, 50],
        "height_bias": 1.6,
        "angle_bias": 0,
        "rationale": "Eye-level naturalistic framing",
    },
    "anime": {
        "focal_lengths": [18, 24, 50],
        "height_bias": 0.9,
        "angle_bias": -10,
        "rationale": "Dynamic low-angle framing with wide establishing shots",
    },
}


# -- Helpers ------------------------------------------------------------------


def _new_id(prefix: str = "sg") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def _vec3(x: float = 0.0, y: float = 0.0, z: float = 0.0) -> dict[str, float]:
    return {"x": float(x), "y": float(y), "z": float(z)}


def _vec3_add(a: dict[str, float], b: dict[str, float]) -> dict[str, float]:
    return {"x": a["x"] + b["x"], "y": a["y"] + b["y"], "z": a["z"] + b["z"]}


def _vec3_sub(a: dict[str, float], b: dict[str, float]) -> dict[str, float]:
    return {"x": a["x"] - b["x"], "y": a["y"] - b["y"], "z": a["z"] - b["z"]}


def _vec3_scale(v: dict[str, float], s: float) -> dict[str, float]:
    return {"x": v["x"] * s, "y": v["y"] * s, "z": v["z"] * s}


def _vec3_lerp(a: dict[str, float], b: dict[str, float], t: float) -> dict[str, float]:
    return {
        "x": a["x"] + (b["x"] - a["x"]) * t,
        "y": a["y"] + (b["y"] - a["y"]) * t,
        "z": a["z"] + (b["z"] - a["z"]) * t,
    }


def _vec3_length(v: dict[str, float]) -> float:
    return math.sqrt(v["x"] ** 2 + v["y"] ** 2 + v["z"] ** 2)


def _vec3_normalize(v: dict[str, float]) -> dict[str, float]:
    mag = _vec3_length(v)
    if mag < 1e-9:
        return _vec3()
    return _vec3_scale(v, 1.0 / mag)


def _vec3_dot(a: dict[str, float], b: dict[str, float]) -> float:
    return a["x"] * b["x"] + a["y"] * b["y"] + a["z"] * b["z"]


def _vec3_cross(a: dict[str, float], b: dict[str, float]) -> dict[str, float]:
    return {
        "x": a["y"] * b["z"] - a["z"] * b["y"],
        "y": a["z"] * b["x"] - a["x"] * b["z"],
        "z": a["x"] * b["y"] - a["y"] * b["x"],
    }


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _angle_lerp(a: float, b: float, t: float) -> float:
    """Shortest-path angle interpolation in degrees."""
    diff = ((b - a) + 180) % 360 - 180
    return a + diff * t


def _default_bounds(scale: dict[str, float]) -> dict[str, dict[str, float]]:
    hs = _vec3_scale(scale, 0.5)
    return {
        "min": _vec3(-hs["x"], -hs["y"], -hs["z"]),
        "max": _vec3(hs["x"], hs["y"], hs["z"]),
    }


_TYPE_DEFAULTS: dict[str, dict[str, Any]] = {
    "character": {"scale": _vec3(1.0, 1.8, 0.5), "y_offset": 0.9},
    "camera": {"scale": _vec3(0.3, 0.3, 0.3), "y_offset": 1.5},
    "prop": {"scale": _vec3(0.5, 0.5, 0.5), "y_offset": 0.25},
    "light": {"scale": _vec3(0.1, 0.1, 0.1), "y_offset": 2.5},
}


# -- Core functions -----------------------------------------------------------


def parse_scene_graph(scene_graph_json: dict[str, Any]) -> dict[str, Any]:
    """Validate and normalize a scene graph structure."""
    if not isinstance(scene_graph_json, dict):
        raise ValueError("scene_graph_json must be a dict")
    elements = scene_graph_json.get("elements")
    if elements is None:
        raise ValueError("scene_graph_json must contain 'elements'")
    if not isinstance(elements, list):
        raise ValueError("'elements' must be a list")

    normalized: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for elem in elements:
        if not isinstance(elem, dict):
            raise ValueError("Each element must be a dict")
        eid = elem.get("id")
        etype = elem.get("type", "prop")
        if not eid:
            raise ValueError("Each element must have an 'id'")
        if eid in seen_ids:
            raise ValueError(f"Duplicate element id: {eid}")
        seen_ids.add(eid)

        defaults = _TYPE_DEFAULTS.get(etype, _TYPE_DEFAULTS["prop"])
        position = elem.get("position", _vec3(0, defaults["y_offset"], 0))
        rotation = elem.get("rotation", _vec3())
        scale = elem.get("scale", defaults["scale"])

        normalized.append({
            "id": eid,
            "type": etype,
            "position": position,
            "rotation": rotation,
            "scale": scale,
            "properties": elem.get("properties", {}),
        })

    return {
        "elements": normalized,
        "metadata": scene_graph_json.get("metadata", {}),
    }


def compute_spatial_layout(scene_graph: dict[str, Any]) -> dict[str, Any]:
    """Calculate 3D positions for all elements based on scene graph data."""
    parsed = parse_scene_graph(scene_graph)
    layout_elements: list[dict[str, Any]] = []

    for elem in parsed["elements"]:
        pos = elem["position"]
        rot = elem["rotation"]
        scale = elem["scale"]
        bounds = _default_bounds(scale)
        world_bounds = {
            "min": _vec3_add(pos, bounds["min"]),
            "max": _vec3_add(pos, bounds["max"]),
        }
        layout_elements.append({
            "id": elem["id"],
            "type": elem["type"],
            "position": pos,
            "rotation": rot,
            "scale": scale,
            "bounds": world_bounds,
        })

    return {"elements": layout_elements}


def detect_occlusions(layout: dict[str, Any]) -> dict[str, Any]:
    """Find elements blocking each other from the camera POV."""
    elements = layout.get("elements", [])
    cameras = [e for e in elements if e["type"] == "camera"]
    cam_pos = cameras[0]["position"] if cameras else _vec3(0, 1.5, 10)
    non_cameras = [e for e in elements if e["type"] != "camera"]

    occlusions: list[dict[str, Any]] = []

    for i, a in enumerate(non_cameras):
        for j, b in enumerate(non_cameras):
            if i == j:
                continue
            dist_a = _vec3_length(_vec3_sub(a["position"], cam_pos))
            dist_b = _vec3_length(_vec3_sub(b["position"], cam_pos))
            if dist_b >= dist_a:
                continue

            a_min, a_max = a["bounds"]["min"], a["bounds"]["max"]
            b_min, b_max = b["bounds"]["min"], b["bounds"]["max"]

            overlap_x = max(0, min(a_max["x"], b_max["x"]) - max(a_min["x"], b_min["x"]))
            overlap_y = max(0, min(a_max["y"], b_max["y"]) - max(a_min["y"], b_min["y"]))
            a_width = max(a_max["x"] - a_min["x"], 1e-9)
            a_height = max(a_max["y"] - a_min["y"], 1e-9)

            pct = (overlap_x * overlap_y) / (a_width * a_height)
            if pct > 0.01:
                occlusions.append({
                    "blocked_element": a["id"],
                    "blocking_element": b["id"],
                    "percentage": round(pct * 100, 2),
                })

    return {"occlusions": occlusions}


def compute_camera_frustum(camera_spec: dict[str, Any]) -> dict[str, Any]:
    """Calculate the visible volume for a camera."""
    focal_length = camera_spec.get("focal_length", 50)
    sensor_width = camera_spec.get("sensor_width", 36.0)
    near = camera_spec.get("near", _DEFAULT_NEAR)
    far = camera_spec.get("far", _DEFAULT_FAR)
    aspect = camera_spec.get("aspect", _DEFAULT_ASPECT)
    position = camera_spec.get("position", _vec3(0, 1.5, 10))

    fov_rad = 2 * math.atan(sensor_width / (2 * focal_length))
    fov_deg = math.degrees(fov_rad)

    def _plane_corners(dist: float) -> list[dict[str, float]]:
        h = math.tan(fov_rad / 2) * dist
        w = h * aspect
        return [
            _vec3(-w, h, -dist),
            _vec3(w, h, -dist),
            _vec3(w, -h, -dist),
            _vec3(-w, -h, -dist),
        ]

    near_corners = [_vec3_add(position, c) for c in _plane_corners(near)]
    far_corners = [_vec3_add(position, c) for c in _plane_corners(far)]

    return {
        "near": near,
        "far": far,
        "fov": round(fov_deg, 4),
        "aspect": aspect,
        "frustum_corners": near_corners + far_corners,
    }


def validate_composition(
    layout: dict[str, Any],
    camera_frustum: dict[str, Any],
) -> dict[str, Any]:
    """Check composition rules: rule of thirds, headroom, lead room."""
    elements = layout.get("elements", [])
    fov = camera_frustum.get("fov", 60)
    aspect = camera_frustum.get("aspect", _DEFAULT_ASPECT)

    violations: list[str] = []
    suggestions: list[str] = []
    score = 1.0

    characters = [e for e in elements if e["type"] == "character"]

    if not characters:
        return {"score": score, "violations": violations, "suggestions": suggestions}

    half_width = math.tan(math.radians(fov / 2)) * 5
    for char in characters:
        cx = char["position"]["x"]
        cy = char["position"]["y"]

        sx = _clamp((cx / (half_width * 2)) + 0.5, 0.0, 1.0)
        sy = _clamp(cy / 3.0, 0.0, 1.0)

        thirds = [1 / 3, 2 / 3]
        min_dist_x = min(abs(sx - t) for t in thirds)
        min_dist_y = min(abs(sy - t) for t in thirds)

        if min_dist_x > _RULE_OF_THIRDS_TOLERANCE and min_dist_y > _RULE_OF_THIRDS_TOLERANCE:
            violations.append(f"{char['id']}: not on rule-of-thirds gridline")
            score -= 0.15
            suggestions.append(f"Move {char['id']} to a thirds intersection for stronger composition")

        head_top = char["bounds"]["max"]["y"]
        headroom = 1.0 - (head_top / 3.0)
        if headroom < _MIN_HEADROOM:
            violations.append(f"{char['id']}: insufficient headroom ({headroom:.2f})")
            score -= 0.1
            suggestions.append(f"Lower {char['id']} or tilt camera up for more headroom")
        elif headroom > _MAX_HEADROOM:
            violations.append(f"{char['id']}: excessive headroom ({headroom:.2f})")
            score -= 0.05
            suggestions.append(f"Raise {char['id']} or tilt camera down to reduce headroom")

    score = _clamp(score, 0.0, 1.0)
    return {
        "score": round(score, 4),
        "violations": violations,
        "suggestions": suggestions,
    }


def generate_depth_map(
    layout: dict[str, Any],
    camera: dict[str, Any],
) -> dict[str, Any]:
    """Simulate depth values per element relative to camera position."""
    cam_pos = camera.get("position", _vec3(0, 1.5, 10))

    depth_entries: list[dict[str, Any]] = []
    for elem in layout.get("elements", []):
        if elem["type"] == "camera":
            continue
        dist = _vec3_length(_vec3_sub(elem["position"], cam_pos))
        depth_entries.append({
            "id": elem["id"],
            "depth": round(dist, 4),
            "layer": -1,
        })

    depth_entries.sort(key=lambda d: d["depth"])
    for idx, entry in enumerate(depth_entries):
        entry["layer"] = idx

    return {"elements": depth_entries}


def interpolate_between_shots(
    scene_graph_a: dict[str, Any],
    scene_graph_b: dict[str, Any],
    t: float,
) -> dict[str, Any]:
    """Smooth interpolation between two scene graphs at parameter t in [0,1]."""
    t = _clamp(t, 0.0, 1.0)
    parsed_a = parse_scene_graph(scene_graph_a)
    parsed_b = parse_scene_graph(scene_graph_b)

    map_a = {e["id"]: e for e in parsed_a["elements"]}
    map_b = {e["id"]: e for e in parsed_b["elements"]}
    all_ids = list(dict.fromkeys(list(map_a.keys()) + list(map_b.keys())))

    interpolated: list[dict[str, Any]] = []
    for eid in all_ids:
        ea = map_a.get(eid)
        eb = map_b.get(eid)
        if ea and eb:
            interpolated.append({
                "id": eid,
                "type": ea["type"],
                "position": _vec3_lerp(ea["position"], eb["position"], t),
                "rotation": {
                    "x": _angle_lerp(ea["rotation"]["x"], eb["rotation"]["x"], t),
                    "y": _angle_lerp(ea["rotation"]["y"], eb["rotation"]["y"], t),
                    "z": _angle_lerp(ea["rotation"]["z"], eb["rotation"]["z"], t),
                },
                "scale": _vec3_lerp(ea["scale"], eb["scale"], t),
                "properties": ea["properties"] if t < 0.5 else eb["properties"],
            })
        elif ea:
            interpolated.append({**ea, "scale": _vec3_scale(ea["scale"], 1.0 - t)})
        else:
            assert eb is not None
            interpolated.append({**eb, "scale": _vec3_scale(eb["scale"], t)})

    return {"elements": interpolated, "t": t}


def suggest_camera_placement(
    scene_graph: dict[str, Any],
    style: str = "cinematic",
) -> dict[str, Any]:
    """AI-driven camera placement suggestions based on style preset."""
    parsed = parse_scene_graph(scene_graph)
    preset = _STYLE_PRESETS.get(style, _STYLE_PRESETS["cinematic"])
    characters = [e for e in parsed["elements"] if e["type"] == "character"]

    targets = characters if characters else parsed["elements"]
    if not targets:
        return {"suggestions": []}

    centroid = _vec3()
    for e in targets:
        centroid = _vec3_add(centroid, e["position"])
    centroid = _vec3_scale(centroid, 1.0 / len(targets))

    suggestions: list[dict[str, Any]] = []
    for fl in preset["focal_lengths"]:
        distance = 2.0 + (fl / 25.0) * 1.5
        cam_y = centroid["y"] * preset["height_bias"]
        cam_z = centroid["z"] + distance

        direction = _vec3_sub(centroid, _vec3(centroid["x"], cam_y, cam_z))
        pitch = math.degrees(math.atan2(-direction["y"], direction["z"])) if direction["z"] != 0 else 0

        suggestions.append({
            "position": _vec3(centroid["x"], round(cam_y, 3), round(cam_z, 3)),
            "rotation": _vec3(round(pitch + preset["angle_bias"], 3), 0, 0),
            "focal_length": fl,
            "rationale": f"{preset['rationale']} (FL {fl}mm)",
        })

    return {"suggestions": suggestions}


def compute_lighting(scene_graph: dict[str, Any]) -> dict[str, Any]:
    """Suggest a 3-point lighting setup based on scene graph layout."""
    parsed = parse_scene_graph(scene_graph)
    characters = [e for e in parsed["elements"] if e["type"] == "character"]
    targets = characters if characters else parsed["elements"]

    if not targets:
        centroid = _vec3(0, 1.0, 0)
    else:
        centroid = _vec3()
        for e in targets:
            centroid = _vec3_add(centroid, e["position"])
        centroid = _vec3_scale(centroid, 1.0 / len(targets))

    key_offset = _vec3(3.0, 4.0, 3.0)
    key_pos = _vec3_add(centroid, key_offset)

    fill_offset = _vec3(-2.5, 2.5, 2.0)
    fill_pos = _vec3_add(centroid, fill_offset)

    back_offset = _vec3(0.0, 4.0, -3.0)
    back_pos = _vec3_add(centroid, back_offset)

    return {
        "key_light": {
            "position": key_pos,
            "intensity": 1.0,
            "color": {"r": 1.0, "g": 0.95, "b": 0.9},
            "type": "directional",
        },
        "fill_light": {
            "position": fill_pos,
            "intensity": 0.4,
            "color": {"r": 0.85, "g": 0.9, "b": 1.0},
            "type": "area",
        },
        "back_light": {
            "position": back_pos,
            "intensity": 0.7,
            "color": {"r": 1.0, "g": 1.0, "b": 1.0},
            "type": "spot",
        },
        "ambient": {
            "intensity": 0.15,
            "color": {"r": 0.6, "g": 0.65, "b": 0.8},
        },
    }
