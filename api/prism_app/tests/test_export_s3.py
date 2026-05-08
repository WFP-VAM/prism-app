from pathlib import Path

import pytest
from prism_app.export_s3 import (
    DEFAULT_EXPORT_MAP_S3_BUCKET,
    is_file_artifact_uri,
    local_path_from_file_uri,
    normalize_export_map_s3_object_prefix,
    parse_export_map_s3_bucket_env,
    parse_s3_uri,
    put_map_export_bytes_local,
    s3_key_for_map_export,
)


def test_default_export_map_s3_bucket_parses():
    assert parse_export_map_s3_bucket_env(DEFAULT_EXPORT_MAP_S3_BUCKET) == (
        "prism-wfp",
        "batch-maps",
    )


def test_s3_key_for_map_export_pdf_zip():
    assert s3_key_for_map_export("jid", "pdf") == "map_exports/jid.pdf"
    assert s3_key_for_map_export("jid", "zip") == "map_exports/jid.zip"


def test_s3_key_for_map_export_with_object_prefix():
    assert (
        s3_key_for_map_export("jid", "pdf", object_prefix="batch-maps")
        == "batch-maps/map_exports/jid.pdf"
    )
    assert (
        s3_key_for_map_export("jid", "pdf", object_prefix="/batch-maps/")
        == "batch-maps/map_exports/jid.pdf"
    )


@pytest.mark.parametrize(
    "raw, want",
    [
        (None, ""),
        ("", ""),
        ("  ", ""),
        ("batch-maps", "batch-maps"),
        ("/a/b/", "a/b"),
    ],
)
def test_normalize_export_map_s3_object_prefix(raw: str | None, want: str) -> None:
    assert normalize_export_map_s3_object_prefix(raw) == want


@pytest.mark.parametrize(
    "raw, bucket, prefix",
    [
        ("", "", ""),
        ("  ", "", ""),
        ("prism-wfp", "prism-wfp", ""),
        ("prism-wfp/batch-maps", "prism-wfp", "batch-maps"),
        ("prism-wfp/batch/more", "prism-wfp", "batch/more"),
        ("s3://prism-wfp", "prism-wfp", ""),
        ("s3://prism-wfp/batch-maps", "prism-wfp", "batch-maps"),
        ("s3://prism-wfp/a/b", "prism-wfp", "a/b"),
        ("  s3://b/p  ", "b", "p"),
    ],
)
def test_parse_export_map_s3_bucket_env(
    raw: str, bucket: str, prefix: str
) -> None:
    assert parse_export_map_s3_bucket_env(raw) == (bucket, prefix)


def test_parse_s3_uri_ok():
    assert parse_s3_uri("s3://b/foo/bar.pdf") == ("b", "foo/bar.pdf")


@pytest.mark.parametrize(
    "bad",
    ["https://x", "s3://bucket-only", "s3://", ""],
)
def test_parse_s3_uri_rejects(bad: str):
    with pytest.raises(ValueError):
        parse_s3_uri(bad)


def test_put_map_export_bytes_local_roundtrip(tmp_path: Path):
    uri = put_map_export_bytes_local(tmp_path, "jid", "pdf", b"%PDF-1.4")
    assert is_file_artifact_uri(uri)
    p = Path(local_path_from_file_uri(uri))
    assert p.is_file()
    assert p.read_bytes() == b"%PDF-1.4"


def test_local_path_from_file_uri_rejects_http():
    with pytest.raises(ValueError):
        local_path_from_file_uri("https://x/y")
