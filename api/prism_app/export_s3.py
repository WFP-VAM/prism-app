"""S3 URI parsing + presigned GET for export artifacts; optional local file writes (dev)."""

from __future__ import annotations

from pathlib import Path
from urllib.parse import unquote, urlparse


def parse_s3_uri(s3_uri: str) -> tuple[str, str]:
    if not s3_uri.startswith("s3://"):
        raise ValueError(f"Expected s3:// URI, got {s3_uri!r}")
    rest = s3_uri[5:]
    bucket, sep, key = rest.partition("/")
    if not sep or not key:
        raise ValueError(f"Invalid s3 URI: {s3_uri!r}")
    return bucket, key


def presign_export_get(s3_uri: str, s3_client: object, expires_in: int = 3600) -> str:
    bucket, key = parse_s3_uri(s3_uri)
    return s3_client.generate_presigned_url(  # type: ignore[union-attr]
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires_in,
    )


def s3_key_for_map_export(job_id: str, artifact_kind: str) -> str:
    """artifact_kind: pdf or zip (matches map_export_jobs.content_type)."""
    ext = "pdf" if artifact_kind == "pdf" else "zip"
    return f"map_exports/{job_id}.{ext}"


def put_map_export_bytes(
    bucket: str,
    job_id: str,
    artifact_kind: str,
    file_bytes: bytes,
    s3_client: object,
) -> str:
    key = s3_key_for_map_export(job_id, artifact_kind)
    content_type = "application/pdf" if artifact_kind == "pdf" else "application/zip"
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
) -> str:
    """Write artifact under ``output_dir``, return ``file:///…`` URI (stored in ``map_export_jobs.s3_uri``)."""
    output_dir.mkdir(parents=True, exist_ok=True)
    ext = "pdf" if artifact_kind == "pdf" else "zip"
    path = (output_dir / f"{job_id}.{ext}").resolve()
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
