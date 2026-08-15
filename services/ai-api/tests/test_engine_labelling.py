"""Every generation response says which engine produced it.

The requirement is that a caller never has to guess whether it received real
output or a placeholder, so these tests treat a missing label as a defect
rather than a cosmetic omission.
"""

from __future__ import annotations

import typing

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.middleware.engine_labelling import ROUTE_CLUSTERS, cluster_for_path
from src.services.engines import REGISTRY, mock_marker, probe, spec_for

client = TestClient(app, raise_server_exceptions=False)


class TestPathMapping:
    def test_longest_prefix_wins(self) -> None:
        """/generate/audio is D4, not the D3/D6 that owns /generate/video."""
        assert cluster_for_path("/ai/v1/generate/audio") == "audio"
        assert cluster_for_path("/ai/v1/generate/video") == "video"

    def test_unmapped_paths_are_not_labelled(self) -> None:
        assert cluster_for_path("/ai/v1/health") is None
        assert cluster_for_path("/ai/v1/jobs/abc") is None

    def test_every_mapped_cluster_is_registered(self) -> None:
        names = {spec.name for spec in REGISTRY}
        for cluster in set(ROUTE_CLUSTERS.values()):
            assert cluster in names, f"{cluster} is mapped but not in the registry"


class TestMockLabelling:
    #: One reachable POST per mock cluster, with a body its handler accepts.
    CASES: typing.ClassVar[list] = [
        ("music", "/ai/v1/music/detect-beats", {"audio_url": "http://x/a.wav"}),
        (
            "dubbing",
            "/ai/v1/dubbing/detect-language",
            {"text": "bonjour tout le monde"},
        ),
    ]

    @pytest.mark.parametrize("cluster,path,body", CASES)
    def test_mock_responses_carry_the_marker(
        self, cluster: str, path: str, body: dict
    ) -> None:
        resp = client.post(path, json=body)
        assert resp.status_code == 200, resp.text
        engine = resp.json()["engine"]
        assert engine["is_mock"] is True
        assert engine["engine"] == "mock"
        assert engine["cluster"] == spec_for(cluster).cluster
        assert engine["reason"]
        assert engine["to_enable"]

    def test_marker_names_what_is_missing(self) -> None:
        marker = mock_marker("video")
        assert marker["is_mock"] is True
        assert marker["missing"]

    def test_unimplemented_clusters_do_not_promise_provisioning(self) -> None:
        """Installing weights cannot fix a cluster with no adapter written."""
        for spec in REGISTRY:
            if spec.real_implemented:
                continue
            assert "no real" in mock_marker(spec.name)["to_enable"]

    def test_real_clusters_are_labelled_real(self) -> None:
        resp = client.post(
            "/ai/v1/scene-graph/decompose", json={"prompt": "a wide shot of a street"}
        )
        assert resp.json()["engine"]["is_mock"] is False


class TestNoFalseLabels:
    def test_errors_are_not_labelled_as_output(self) -> None:
        """A 422 is not generated output and must not carry an engine block."""
        resp = client.post("/ai/v1/music/detect-beats", json={})
        assert resp.status_code == 422
        assert "engine" not in resp.json()

    def test_handler_supplied_marker_is_not_overwritten(self) -> None:
        """A route that knows it ran the real path beats the prefix mapping."""
        resp = client.post(
            "/ai/v1/scene-graph/decompose", json={"prompt": "a close-up at night"}
        )
        engine = resp.json()["engine"]
        assert engine["is_mock"] is False
        assert engine.get("detail")

    def test_qc_marker_reflects_the_artifact_not_the_prefix(self, tmp_path) -> None:
        """QC is real-by-default, but an unopened artifact is still mock."""
        resp = client.post(
            "/ai/v1/qc/validate",
            json={"output_url": "https://cdn.example.com/o.mp4", "checks": ["loudness"]},
        )
        assert resp.json()["engine"]["is_mock"] is True


class TestCapabilitiesAgreement:
    def test_capabilities_matches_the_markers(self) -> None:
        """One source of truth: /capabilities and the response labels agree."""
        body = client.get("/ai/v1/capabilities").json()
        by_name = {entry["name"]: entry for entry in body["clusters"]}
        for spec in REGISTRY:
            entry = by_name[spec.name]
            assert entry["status"] == probe(spec.name).status
            if entry["status"] == "mock":
                assert mock_marker(spec.name)["is_mock"] is True
