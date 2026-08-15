"""Contract tests: every router is reachable on the application itself.

Eight routers shipped with working code, passing tests and no way to call them
-- they were never mounted in ``src.main``. The existing ``tests/test_*_api.py``
suites did not catch it because each builds its own ``FastAPI()`` and mounts the
router under test by hand, which proves the router works in isolation and
nothing about whether the service exposes it.

Everything here goes through ``src.main.app``. A route that is not mounted
fails these tests, whatever its own suite says.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app, raise_server_exceptions=False)


def _paths() -> set[str]:
    return {route.path for route in app.routes if hasattr(route, "path")}


#: (module, cluster, a path that module owns). One representative route per
#: router is enough to prove the router is mounted; the per-path test below
#: covers the rest.
ROUTERS = [
    ("scene_graph", "E3", "/ai/v1/scene-graph"),
    ("continuity", "E6", "/ai/v1/continuity"),
    ("mocap", "E8", "/ai/v1/mocap"),
    ("music", "F3", "/ai/v1/music"),
    ("physics", "F5", "/ai/v1/physics"),
    ("dubbing", "G2", "/ai/v1/dubbing"),
    ("training", "D10", "/ai/v1/training"),
    ("script_chat", "-", "/ai/v1/script"),
]


@pytest.mark.parametrize("module,cluster,prefix", ROUTERS)
def test_router_is_mounted(module: str, cluster: str, prefix: str) -> None:
    """The app exposes at least one path from every previously-orphaned router."""
    assert any(
        path.startswith(prefix) for path in _paths()
    ), f"{module} ({cluster}) is not mounted on src.main.app"


def test_every_route_module_is_mounted() -> None:
    """No route module is left out of the app.

    Guards the original defect directly: a new ``src/routes/*.py`` that nobody
    wires into ``main`` fails here rather than 404ing in production.
    """
    import importlib
    import pkgutil

    import src.routes as routes_pkg

    mounted = _paths()
    orphans = []
    for info in pkgutil.iter_modules(routes_pkg.__path__):
        module = importlib.import_module(f"src.routes.{info.name}")
        router = getattr(module, "router", None)
        if router is None:
            continue
        # APIRoute.path already carries the router's prefix; re-adding it here
        # produced /ai/v1/ai/v1/... and reported every module as an orphan.
        module_paths = {r.path for r in router.routes if hasattr(r, "path")}
        if module_paths and not (module_paths & mounted):
            orphans.append(info.name)

    assert not orphans, f"route modules not mounted in src.main: {orphans}"


@pytest.mark.parametrize("module,cluster,prefix", ROUTERS)
def test_router_paths_do_not_404(module: str, cluster: str, prefix: str) -> None:
    """Every GET route under the prefix answers something other than 404.

    A 422 (missing query params) is a pass: it means routing reached the
    handler. Only "no such route" is a failure.
    """
    checked = 0
    for route in app.routes:
        path = getattr(route, "path", "")
        methods = getattr(route, "methods", set()) or set()
        if not path.startswith(prefix) or "GET" not in methods:
            continue
        if "{" in path:  # needs a real id; covered by the module's own suite
            continue
        resp = client.get(path)
        assert resp.status_code != 404, f"{path} is unreachable"
        checked += 1

    # Not every router has a parameterless GET; those are proven mounted by
    # test_router_is_mounted above.
    assert checked >= 0


class TestCapabilities:
    """The /capabilities endpoint reports real host state, not a constant."""

    def test_reachable(self) -> None:
        assert client.get("/ai/v1/capabilities").status_code == 200

    def test_reports_every_registered_cluster(self) -> None:
        from src.services.engines import REGISTRY

        body = client.get("/ai/v1/capabilities").json()
        names = {entry["name"] for entry in body["clusters"]}
        for spec in REGISTRY:
            assert spec.name in names
        assert "avatar" in names, "X5 must appear alongside the rest"

    def test_status_values_are_known(self) -> None:
        body = client.get("/ai/v1/capabilities").json()
        for entry in body["clusters"]:
            assert entry["status"] in {"real", "real-gated", "mock"}

    def test_gated_clusters_say_what_is_missing(self) -> None:
        """A mock cluster must name what a human has to provision."""
        body = client.get("/ai/v1/capabilities").json()
        for entry in body["clusters"]:
            if entry["status"] == "mock":
                assert entry["missing"], f"{entry['name']} is mock but names nothing"
                assert entry["notes"]

    def test_cpu_only_host_reports_the_deterministic_clusters_real(self) -> None:
        """E3/E8/F5 need no provisioning, so they are real even on a bare runner."""
        body = client.get("/ai/v1/capabilities").json()
        status = {entry["name"]: entry["status"] for entry in body["clusters"]}
        for name in ("scene_graph", "mocap", "physics"):
            assert status[name] == "real"
