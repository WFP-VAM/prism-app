"""Tests for the AA drought CSV upload admin field and served-status helper."""

import json
from io import BytesIO

import pytest
from prism_app.aa_drought.csv_field import (
    AaDroughtCsvFileField,
    format_aa_drought_csv_for_display,
)
from prism_app.aa_drought.published_datasets import served_statuses
from prism_app.database.aa_drought_model import AaDroughtStatus
from starlette.datastructures import FormData, UploadFile
from starlette_admin._types import RequestAction

_CSV = "district,index\nGwembe,SPI DJF\n"


@pytest.fixture
def field() -> AaDroughtCsvFileField:
    return AaDroughtCsvFileField("csv_content")


def _upload(name: str, payload: bytes, content_type: str = "text/csv") -> UploadFile:
    return UploadFile(
        filename=name,
        file=BytesIO(payload),
        headers={"content-type": content_type},
    )


@pytest.mark.asyncio
async def test_parse_form_data_reads_csv_upload(field: AaDroughtCsvFileField) -> None:
    form = FormData([("csv_content", _upload("aa.csv", _CSV.encode()))])
    parsed = await field.parse_form_data(None, form, RequestAction.CREATE)
    assert parsed == _CSV


@pytest.mark.asyncio
async def test_parse_form_data_strips_utf8_bom(field: AaDroughtCsvFileField) -> None:
    form = FormData(
        [("csv_content", _upload("aa.csv", b"\xef\xbb\xbf" + _CSV.encode()))]
    )
    parsed = await field.parse_form_data(None, form, RequestAction.CREATE)
    assert parsed == _CSV
    assert not parsed.startswith("﻿")


@pytest.mark.asyncio
async def test_parse_form_data_rejects_non_csv(field: AaDroughtCsvFileField) -> None:
    form = FormData([("csv_content", _upload("aa.txt", b"x", "text/plain"))])
    parsed = await field.parse_form_data(None, form, RequestAction.CREATE)
    assert parsed is None


@pytest.mark.asyncio
async def test_parse_form_data_keeps_existing_on_edit(
    field: AaDroughtCsvFileField,
) -> None:
    form = FormData([("csv_content__existing", json.dumps(_CSV))])
    parsed = await field.parse_form_data(None, form, RequestAction.EDIT)
    assert parsed == _CSV


def test_format_display_truncates_long_csv(field: AaDroughtCsvFileField) -> None:
    big = "header\n" + "\n".join(f"row{i}" for i in range(200))
    rendered = field.format_display(big)
    assert "more rows" in rendered
    assert rendered == format_aa_drought_csv_for_display(big)


def test_served_statuses_published_only_by_default() -> None:
    assert served_statuses(include_staging=False) == [AaDroughtStatus.published]


def test_served_statuses_includes_staging_when_requested() -> None:
    statuses = served_statuses(include_staging=True)
    assert AaDroughtStatus.published in statuses
    assert AaDroughtStatus.staging in statuses
    assert AaDroughtStatus.draft not in statuses
    assert AaDroughtStatus.archived not in statuses
