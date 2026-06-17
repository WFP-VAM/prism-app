from pathlib import Path
from unittest.mock import patch

import pytest
from prism_app.export_s3 import (
    DEFAULT_EXPORT_MAP_S3_BUCKET,
    is_file_artifact_uri,
    local_path_from_file_uri,
    map_export_s3_client,
    normalize_export_map_s3_object_prefix,
    parse_export_map_s3_bucket_env,
    parse_s3_uri,
    put_map_export_bytes_local,
    s3_key_for_map_export,
    slug_s3_path_segment,
)


def test_default_export_map_s3_bucket_parses():
    assert parse_export_map_s3_bucket_env(DEFAULT_EXPORT_MAP_S3_BUCKET) == (
        "prism-wfp",
        "batch-maps",
    )


def test_map_export_s3_client_uses_internal_and_public_endpoints(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AWS_ENDPOINT_URL", "http://minio:9000")
    monkeypatch.setenv("AWS_PRESIGN_ENDPOINT_URL", "http://localhost:9000")
    with patch("prism_app.export_s3.boto3.client") as mock_client:
        map_export_s3_client()
        map_export_s3_client(for_presign=True)
    assert mock_client.call_args_list[0].kwargs["endpoint_url"] == "http://minio:9000"
    assert (
        mock_client.call_args_list[1].kwargs["endpoint_url"] == "http://localhost:9000"
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


def test_s3_key_for_map_export_public_maps():
    assert (
        s3_key_for_map_export(
            "jid",
            "pdf",
            public_maps_segments=("mozambique", "precip_blended_dekad"),
        )
        == "public_maps/mozambique/precip_blended_dekad/jid.pdf"
    )
    assert (
        s3_key_for_map_export(
            "jid",
            "pdf",
            object_prefix="batch-maps",
            public_maps_segments=("moz", "layer"),
        )
        == "batch-maps/public_maps/moz/layer/jid.pdf"
    )


@pytest.mark.parametrize(
    "raw,want",
    [
        ("Mozambique", "mozambique"),
        ("a/b", "a-b"),
        ("  Mixed_Case  ", "mixed_case"),
    ],
)
def test_slug_s3_path_segment(raw: str, want: str) -> None:
    assert slug_s3_path_segment(raw) == want


def test_slug_s3_path_segment_rejects_empty() -> None:
    with pytest.raises(ValueError):
        slug_s3_path_segment("   !!!   ")


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
def test_parse_export_map_s3_bucket_env(raw: str, bucket: str, prefix: str) -> None:
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


def test_put_map_export_bytes_local_public_subpath(tmp_path: Path):
    uri = put_map_export_bytes_local(
        tmp_path,
        "jid",
        "pdf",
        b"%PDF-1.4",
        public_maps_segments=("moz", "layer1"),
    )
    p = Path(local_path_from_file_uri(uri))
    assert p.is_file()
    assert p.parent.name == "layer1"
    assert p.parent.parent.name == "moz"
    assert p.parent.parent.parent.name == "public_maps"


def test_local_path_from_file_uri_rejects_http():
    with pytest.raises(ValueError):
        local_path_from_file_uri("https://x/y")
