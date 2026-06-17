"""S3 URI parsing + presigned GET for export artifacts; optional local file writes (dev)."""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote, urlparse

import boto3
from botocore.config import Config

# When ``EXPORT_MAP_S3_BUCKET`` is unset and ``EXPORT_MAP_LOCAL_OUTPUT_DIR`` is unset (worker).
DEFAULT_EXPORT_MAP_S3_BUCKET = "s3://prism-wfp/batch-maps"

# Region for default map-export bucket (prism-wfp). SigV4 presigns must match bucket region.
# Callers for other buckets can pass ``region_name=...`` into ``map_export_s3_client``.
MAP_EXPORT_S3_SIGNING_REGION = "us-east-2"

# Buckets/regions often reject legacy SigV2 presigned URLs (`AWSAccessKeyId=…` query params).
_S3_SIGV4 = Config(signature_version="s3v4")


def map_export_s3_client(*, for_presign: bool = False, **kwargs: Any) -> Any:
    """S3 client using AWS SigV4; default region matches ``DEFAULT_EXPORT_MAP_S3_BUCKET``.

    Set ``for_presign=True`` for browser-facing presigned GET URLs (``AWS_PRESIGN_ENDPOINT_URL``,
    falling back to ``AWS_ENDPOINT_URL``). Otherwise uses ``AWS_ENDPOINT_URL`` for in-cluster
    put/head/verify (e.g. ``http://minio:9000`` in local Docker).
    """
    kwargs.setdefault("region_name", MAP_EXPORT_S3_SIGNING_REGION)
    if for_presign:
        endpoint = (
            os.environ.get("AWS_PRESIGN_ENDPOINT_URL", "").strip()
            or os.environ.get("AWS_ENDPOINT_URL", "").strip()
        )
    else:
        endpoint = os.environ.get("AWS_ENDPOINT_URL", "").strip()
    if endpoint:
        kwargs["endpoint_url"] = endpoint
    return boto3.client("s3", config=_S3_SIGV4, **kwargs)


def get_s3_client_for_presign() -> object:
    """S3 client for browser-facing presigned GET URLs."""
    return map_export_s3_client(for_presign=True)


def s3_client_for_artifact(
    uri: str | None,
    injected: object | None = None,
) -> object | None:
    """S3 client for verifying a non-local artifact URI, or ``None`` for file:// / missing URI."""
    if not uri or is_file_artifact_uri(uri):
        return None
    if injected is not None:
        return injected
    return map_export_s3_client()


def parse_s3_uri(s3_uri: str) -> tuple[str, str]:
    if not s3_uri.startswith("s3://"):
        raise ValueError(f"Expected s3:// URI, got {s3_uri!r}")
    rest = s3_uri[5:]
    bucket, sep, key = rest.partition("/")
    if not sep or not key:
        raise ValueError(f"Invalid s3 URI: {s3_uri!r}")
    return bucket, key


def format_content_disposition_attachment(filename: str) -> str:
    """RFC 6266-ish ``attachment`` disposition for ``get_object`` presign Params."""
    if "\r" in filename or "\n" in filename:
        filename = filename.replace("\r", "").replace("\n", "_")
    try:
        filename.encode("ascii")
    except UnicodeEncodeError:
        ascii_fallback = filename.encode("ascii", "replace").decode("ascii")
        ascii_fallback = ascii_fallback.replace('"', "").replace("\\", "") or "download"
        return (
            f'attachment; filename="{ascii_fallback}"; '
            f"filename*=UTF-8''{quote(filename)}"
        )
    escaped = filename.replace("\\", "_").replace('"', "_")
    return f'attachment; filename="{escaped}"'


def presign_export_get(
    s3_uri: str,
    s3_client: object,
    expires_in: int = 3600,
    *,
    download_filename: str | None = None,
) -> str:
    bucket, key = parse_s3_uri(s3_uri)
    params: dict[str, Any] = {"Bucket": bucket, "Key": key}
    if download_filename:
        params["ResponseContentDisposition"] = format_content_disposition_attachment(
            download_filename
        )
        params["ResponseContentType"] = _map_export_content_type(
            _map_export_file_extension_from_key(key),
        )

    return s3_client.generate_presigned_url(  # type: ignore[union-attr]
        "get_object",
        Params=params,
        ExpiresIn=expires_in,
    )


def _map_export_file_extension_from_key(key: str) -> str:
    lower = key.rsplit("/", 1)[-1].lower()
    return "pdf" if lower.endswith(".pdf") else "zip"


def _map_export_file_extension(artifact_kind: str) -> str:
    return "pdf" if artifact_kind == "pdf" else "zip"


def _map_export_content_type(artifact_kind: str) -> str:
    return f"application/{_map_export_file_extension(artifact_kind)}"


def slug_s3_path_segment(raw: str) -> str:
    """Safe single path segment for S3 keys (lowercase, no slashes or odd chars)."""
    s = raw.strip().lower()
    s = re.sub(r"[^a-z0-9._-]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    if not s:
        raise ValueError("path segment empty after slugify")
    return s


def normalize_export_map_s3_object_prefix(raw: str | None) -> str:
    """Strip slashes; optional folder before ``map_exports/…`` in the object key."""
    if raw is None:
        return ""
    s = raw.strip().strip("/")
    return s


def parse_export_map_s3_bucket_env(raw: str) -> tuple[str, str]:
    """
    Parse ``EXPORT_MAP_S3_BUCKET``: bare bucket, ``bucket/prefix``, ``s3://bucket``, or
    ``s3://bucket/prefix``. Returns ``(bucket, object_prefix)``; prefix is normalized
    (no leading/trailing ``/``). Empty input → ``("", "")``.
    """
    s = raw.strip()
    if not s:
        return "", ""
    if s.startswith("s3://"):
        parsed = urlparse(s)
        bucket = (parsed.netloc or "").strip()
        path = (parsed.path or "").strip("/")
        return bucket, normalize_export_map_s3_object_prefix(path or None)
    if "/" in s:
        bucket, _, rest = s.partition("/")
        return bucket.strip(), normalize_export_map_s3_object_prefix(rest)
    return s, ""


def s3_key_for_map_export(
    job_id: str,
    artifact_kind: str,
    *,
    object_prefix: str = "",
    public_maps_segments: tuple[str, str] | None = None,
) -> str:
    """artifact_kind: pdf or zip (matches map_export_jobs.content_type).

    When ``public_maps_segments`` is ``(country, layer)`` (already slugified), the key is
    ``public_maps/{country}/{layer}/{job_id}.{ext}``; otherwise ``map_exports/…``.
    """
    ext = _map_export_file_extension(artifact_kind)
    if public_maps_segments:
        c_seg, l_seg = public_maps_segments
        base = f"public_maps/{c_seg}/{l_seg}/{job_id}.{ext}"
    else:
        base = f"map_exports/{job_id}.{ext}"
    op = normalize_export_map_s3_object_prefix(object_prefix)
    return f"{op}/{base}" if op else base


def get_export_map_s3_bucket_and_prefix() -> tuple[str, str]:
    """Resolve bucket and object prefix the same way as ``export_map_worker``."""
    local_raw = os.environ.get("EXPORT_MAP_LOCAL_OUTPUT_DIR", "").strip()
    if "EXPORT_MAP_S3_BUCKET" not in os.environ and not local_raw:
        bucket_raw = DEFAULT_EXPORT_MAP_S3_BUCKET
    else:
        bucket_raw = os.environ.get("EXPORT_MAP_S3_BUCKET", "").strip()
    return parse_export_map_s3_bucket_env(bucket_raw)


def put_map_export_bytes(
    bucket: str,
    job_id: str,
    artifact_kind: str,
    file_bytes: bytes,
    s3_client: object,
    *,
    object_prefix: str = "",
    public_maps_segments: tuple[str, str] | None = None,
) -> str:
    op = normalize_export_map_s3_object_prefix(object_prefix or None)
    key = s3_key_for_map_export(
        job_id,
        artifact_kind,
        object_prefix=op,
        public_maps_segments=public_maps_segments,
    )
    content_type = _map_export_content_type(artifact_kind)
    s3_client.put_object(  # type: ignore[union-attr]
        Bucket=bucket,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return f"s3://{bucket}/{key}"


def put_map_export_bytes_local(
    output_dir: Path,
    job_id: str,
    artifact_kind: str,
    file_bytes: bytes,
    *,
    public_maps_segments: tuple[str, str] | None = None,
) -> str:
    """Write artifact under ``output_dir``, return ``file:///…`` URI (stored in ``map_export_jobs.s3_uri``)."""
    ext = _map_export_file_extension(artifact_kind)
    if public_maps_segments:
        c_seg, l_seg = public_maps_segments
        dest_dir = output_dir / "public_maps" / c_seg / l_seg
    else:
        dest_dir = output_dir
    dest_dir.mkdir(parents=True, exist_ok=True)
    path = (dest_dir / f"{job_id}.{ext}").resolve()
    path.write_bytes(file_bytes)
    return path.as_uri()


def is_file_artifact_uri(uri: str) -> bool:
    return uri.startswith("file://")


def local_path_from_file_uri(file_uri: str) -> str:
    """Map ``file:///abs/path`` to a filesystem path (POSIX)."""
    parsed = urlparse(file_uri)
    if parsed.scheme != "file":
        raise ValueError(f"Expected file URI, got {file_uri!r}")
    if parsed.netloc:
        raise ValueError(f"Unsupported file URI with authority: {file_uri!r}")
    return unquote(parsed.path)


def map_export_artifact_exists(
    s3_uri: str | None,
    *,
    s3_client: object | None = None,
) -> bool:
    """
    True if the export artifact is still readable (local path exists, or S3 head OK).

    ``file://`` URIs are always checked on disk. For ``s3://``, if ``s3_client`` is
    omitted, returns True (assume valid — use a client from the API layer to verify).
    """
    if not s3_uri:
        return False
    if is_file_artifact_uri(s3_uri):
        try:
            path = Path(local_path_from_file_uri(s3_uri))
            return path.is_file() and path.stat().st_size > 0
        except (ValueError, OSError):
            return False
    if s3_uri.startswith("s3://"):
        if s3_client is None:
            return (
                True  # verification requires a client; caller API always provides one
            )
        bucket, key = parse_s3_uri(s3_uri)
        try:
            s3_client.head_object(Bucket=bucket, Key=key)  # type: ignore[union-attr]
            return True
        except Exception:
            return False
    return False
