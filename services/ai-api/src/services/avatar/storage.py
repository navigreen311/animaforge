"""Artifact storage for avatar reconstruction outputs.

Every URL this module returns points at a byte string that was actually
written.  There is no code path that mints a URL for an artifact that does
not exist — :func:`store_artifact` writes first and derives the URL from the
path it wrote to.

Two backends are supported:

``local`` (default)
    Writes under ``AVATAR_STORAGE_DIR``.  If ``AVATAR_STORAGE_BASE_URL`` is
    set the returned URL is ``<base>/<key>``; otherwise it is the ``file://``
    URL of the file on disk.  A ``file://`` URL is not servable to a browser,
    which is deliberate: it is honest about where the bytes live.

``s3``
    Requires ``boto3`` (see ``requirements-ml.txt``) plus ``AVATAR_S3_BUCKET``.
    If either is missing, :func:`store_artifact` raises rather than silently
    falling back to a fabricated CDN URL.
"""

from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote

DEFAULT_STORAGE_DIR = "var/avatar-artifacts"


@dataclass(frozen=True)
class StoredArtifact:
    """A byte payload that has been written to storage."""

    key: str
    url: str
    size_bytes: int
    sha256: str
    backend: str
    local_path: str | None = None

    def as_dict(self) -> dict[str, object]:
        return {
            "key": self.key,
            "url": self.url,
            "size_bytes": self.size_bytes,
            "sha256": self.sha256,
            "backend": self.backend,
        }


def storage_backend() -> str:
    """Return the configured backend name (``local`` or ``s3``)."""
    return os.getenv("AVATAR_STORAGE_BACKEND", "local").strip().lower() or "local"


def storage_root() -> Path:
    """Return the directory local artifacts are written under."""
    return Path(os.getenv("AVATAR_STORAGE_DIR", DEFAULT_STORAGE_DIR)).expanduser()


def store_artifact(key: str, payload: bytes, content_type: str) -> StoredArtifact:
    """Persist ``payload`` under ``key`` and return a handle describing it.

    Raises:
        ValueError: if ``key`` is empty or escapes the storage root.
        RuntimeError: if the configured backend is unavailable.
    """
    normalised = _normalise_key(key)
    digest = hashlib.sha256(payload).hexdigest()
    backend = storage_backend()

    if backend == "local":
        destination = storage_root() / normalised
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(payload)
        resolved = destination.resolve()
        return StoredArtifact(
            key=normalised,
            url=_local_url(normalised, resolved),
            size_bytes=len(payload),
            sha256=digest,
            backend="local",
            local_path=str(resolved),
        )

    if backend == "s3":
        return _store_s3(normalised, payload, content_type, digest)

    raise RuntimeError(
        f"Unknown AVATAR_STORAGE_BACKEND {backend!r}; expected 'local' or 's3'"
    )


# ── Internals ────────────────────────────────────────────────────────────────


def _normalise_key(key: str) -> str:
    cleaned = key.strip().strip("/")
    if not cleaned:
        raise ValueError("Artifact key must not be empty")
    parts = [part for part in cleaned.split("/") if part not in ("", ".")]
    if any(part == ".." for part in parts):
        raise ValueError(f"Artifact key must not traverse parents: {key!r}")
    return "/".join(parts)


def _local_url(key: str, resolved: Path) -> str:
    base = os.getenv("AVATAR_STORAGE_BASE_URL", "").strip().rstrip("/")
    if base:
        return f"{base}/{quote(key)}"
    return resolved.as_uri()


def _store_s3(
    key: str,
    payload: bytes,
    content_type: str,
    digest: str,
) -> StoredArtifact:
    bucket = os.getenv("AVATAR_S3_BUCKET", "").strip()
    if not bucket:
        raise RuntimeError(
            "AVATAR_STORAGE_BACKEND=s3 requires AVATAR_S3_BUCKET to be set"
        )

    try:
        import boto3  # type: ignore[import-not-found]
    except ImportError as exc:  # pragma: no cover - exercised only with boto3 absent
        raise RuntimeError(
            "AVATAR_STORAGE_BACKEND=s3 requires boto3 (see requirements-ml.txt)"
        ) from exc

    prefix = os.getenv("AVATAR_S3_PREFIX", "").strip().strip("/")
    object_key = f"{prefix}/{key}" if prefix else key

    boto3.client("s3").put_object(
        Bucket=bucket,
        Key=object_key,
        Body=payload,
        ContentType=content_type,
    )

    base = os.getenv("AVATAR_STORAGE_BASE_URL", "").strip().rstrip("/")
    url = (
        f"{base}/{quote(object_key)}"
        if base
        else f"s3://{bucket}/{quote(object_key)}"
    )
    return StoredArtifact(
        key=object_key,
        url=url,
        size_bytes=len(payload),
        sha256=digest,
        backend="s3",
    )
