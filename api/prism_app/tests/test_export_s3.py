import pytest

from prism_app.export_s3 import parse_s3_uri


def test_parse_s3_uri_ok():
    assert parse_s3_uri("s3://b/foo/bar.pdf") == ("b", "foo/bar.pdf")


@pytest.mark.parametrize(
    "bad",
    ["https://x", "s3://bucket-only", "s3://", ""],
)
def test_parse_s3_uri_rejects(bad: str):
    with pytest.raises(ValueError):
        parse_s3_uri(bad)
