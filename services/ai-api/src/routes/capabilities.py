"""Capability reporting for every generation cluster.

Mirrors ``GET /ai/v1/avatar/capabilities`` (X5) and widens it to the whole
service. The point is that a caller -- or an operator debugging why output
looks synthetic -- can ask one endpoint what is actually real on this host,
and get an answer derived from probing the machine rather than from a constant.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from src.services import engines
from src.services.avatar import engine as avatar_engine

router = APIRouter(prefix="/ai/v1")


@router.get("/capabilities")
async def capabilities() -> dict[str, Any]:
    """Report the true engine state of every cluster."""
    statuses = engines.probe_all()

    # X5 keeps its own probe: it checks CUDA device count and a weights
    # directory in ways the generic registry does not model.
    avatar = avatar_engine.probe()
    avatar_entry: dict[str, Any] = {
        "cluster": "X5",
        "name": "avatar",
        "env_var": "AVATAR_ENGINE",
        "requested_engine": avatar.requested_engine,
        "active_engine": avatar.active_engine,
        "real_engine_available": avatar.real_engine_available,
        # X5 has a written real adapter, so it is real-gated whether or not
        # this host happens to be provisioned for it. Availability is reported
        # by real_engine_available/missing, not by downgrading the status.
        "status": "real-gated",
        "missing": avatar.missing,
        "packages_present": {
            "torch": avatar.torch_installed,
            "gsplat": avatar.gsplat_installed,
            "nerfstudio": avatar.nerfstudio_installed,
        },
        "cuda_available": avatar.cuda_available,
        "cuda_device_count": avatar.cuda_device_count,
        "weights_dir": avatar.weights_dir,
        "notes": avatar.notes,
    }

    entries = [status.as_dict() for status in statuses] + [avatar_entry]
    entries.sort(key=lambda e: str(e["cluster"]))

    counts: dict[str, int] = {"real": 0, "real-gated": 0, "mock": 0}
    for entry in entries:
        counts[str(entry["status"])] = counts.get(str(entry["status"]), 0) + 1

    return {
        "service": "ai-api",
        "clusters": entries,
        "summary": counts,
        "notes": (
            "'real' needs nothing provisioned. 'real-gated' has a genuine "
            "implementation whose dependencies are present but which is not "
            "selected -- set the cluster's env var to 'real'. 'mock' returns "
            "synthetic output and every such response carries is_mock=true."
        ),
    }
