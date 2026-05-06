"""S3 URI parsing + presigned GET for export artifacts."""

from __future__ import annotations


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
