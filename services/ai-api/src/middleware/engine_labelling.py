"""Stamp every response with the engine that produced it.

The honesty requirement is that a caller never has to guess whether it received
generated output or a placeholder. Doing that per-endpoint means ~60 handlers
each remembering to add a field, and the one that forgets is precisely the one
that misleads someone.

So it is done here instead, once, after serialisation. Two consequences worth
knowing:

* It survives ``response_model``. A pydantic model that does not declare an
  ``engine`` field silently drops one the handler added -- which had already
  happened to the QC endpoint, leaving it returning a bare ``passed`` with no
  way to learn the artifact was never opened.
* A new endpoint under an existing prefix is labelled the moment it exists.
  Forgetting is not an available failure mode.

Handlers that set their own ``engine`` block keep it: a route that knows it ran
the real path is more specific than a prefix mapping.
"""

from __future__ import annotations

import json

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from src.services.engines import mock_marker, real_marker, spec_for

#: Path prefix -> cluster name in the engine registry. Longest prefix wins, so
#: a more specific route can be mapped to a different cluster than its parent.
ROUTE_CLUSTERS: dict[str, str] = {
    "/ai/v1/generate/video": "video",
    "/ai/v1/convert/": "video",
    "/ai/v1/director/": "video",
    "/ai/v1/edit/": "video",
    "/ai/v1/generate/audio": "audio",
    "/ai/v1/style/": "style",
    "/ai/v1/music/": "music",
    "/ai/v1/dubbing/": "dubbing",
    "/ai/v1/training/": "training",
    "/ai/v1/continuity/": "continuity",
    "/ai/v1/scene-graph/": "scene_graph",
    "/ai/v1/mocap/": "mocap",
    "/ai/v1/physics/": "physics",
    "/ai/v1/qc/": "qc",
}


def cluster_for_path(path: str) -> str | None:
    """Return the cluster owning *path*, or None if it is not a generation route."""
    best: str | None = None
    for prefix in ROUTE_CLUSTERS:
        if path.startswith(prefix) and (best is None or len(prefix) > len(best)):
            best = prefix
    return ROUTE_CLUSTERS[best] if best else None


class EngineLabellingMiddleware(BaseHTTPMiddleware):
    """Inject an ``engine`` block into JSON responses from generation routes."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        cluster = cluster_for_path(request.url.path)
        if cluster is None:
            return response
        if response.status_code >= 400:
            # An error body is not output; labelling it would imply it was.
            return response
        if not response.headers.get("content-type", "").startswith("application/json"):
            return response

        body = b"".join([chunk async for chunk in response.body_iterator])
        try:
            payload = json.loads(body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

        if isinstance(payload, dict):
            payload = _label(payload, cluster)
            body = json.dumps(payload).encode()

        headers = dict(response.headers)
        headers.pop("content-length", None)
        return Response(
            content=body,
            status_code=response.status_code,
            headers=headers,
            media_type="application/json",
        )


def _label(payload: dict, cluster: str) -> dict:
    """Add the engine block, unless the handler already stated one."""
    existing = payload.get("engine")
    if isinstance(existing, dict) and "is_mock" in existing:
        return payload

    spec = spec_for(cluster)
    if spec.real_implemented and spec.real_by_default:
        payload["engine"] = real_marker(cluster)
    else:
        payload["engine"] = mock_marker(cluster)
    return payload
