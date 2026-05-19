"""Tests for dashboard config JSON file admin field."""

import json
from io import BytesIO

import pytest
from prism_app.dashboard.dashboard_config_field import (
    DashboardConfigJsonFileField,
    format_dashboard_config_json_for_display,
)
from starlette.datastructures import FormData, UploadFile
from starlette_admin._types import RequestAction


@pytest.fixture
def field() -> DashboardConfigJsonFileField:
    return DashboardConfigJsonFileField("config")


def _upload_file(
    name: str, payload: bytes, content_type: str = "application/json"
) -> UploadFile:
    return UploadFile(
        filename=name,
        file=BytesIO(payload),
        headers={"content-type": content_type},
    )


@pytest.mark.asyncio
async def test_parse_form_data_reads_json_upload(
    field: DashboardConfigJsonFileField,
) -> None:
    payload = {"title": "Example"}
    form = FormData(
        [("config", _upload_file("dashboard.json", json.dumps(payload).encode()))]
    )

    parsed = await field.parse_form_data(None, form, RequestAction.CREATE)

    assert parsed == payload


@pytest.mark.asyncio
async def test_parse_form_data_rejects_non_json_extension(
    field: DashboardConfigJsonFileField,
) -> None:
    form = FormData([("config", _upload_file("dashboard.txt", b"{}", "text/plain"))])

    parsed = await field.parse_form_data(None, form, RequestAction.CREATE)

    assert parsed is None


@pytest.mark.asyncio
async def test_parse_form_data_keeps_existing_config_on_edit_without_upload(
    field: DashboardConfigJsonFileField,
) -> None:
    existing = [{"title": "Saved"}]
    form = FormData([("config__existing", json.dumps(existing))])

    parsed = await field.parse_form_data(None, form, RequestAction.EDIT)

    assert parsed == existing


def test_format_display_prettifies_json(
    field: DashboardConfigJsonFileField,
) -> None:
    data = {"title": "Example", "nested": [1, 2]}
    rendered = field.format_display(data)

    assert rendered == format_dashboard_config_json_for_display(data)
    assert "\n" in rendered
    assert '"title": "Example"' in rendered
