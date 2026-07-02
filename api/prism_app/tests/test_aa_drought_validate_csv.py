"""Tests for AA drought admin CSV validate endpoint."""

import json
from io import BytesIO

import pytest
from prism_app.aa_drought.validate_csv import validate_aa_drought_csv_upload
from starlette.datastructures import FormData, UploadFile
from starlette.requests import Request

_HEADER = (
    "district,index,category,window,issue_ready,issue_set,trigger_ready,"
    "trigger_set,vulnerability,prob_ready,prob_set,season,date_ready,date_set"
)
_GOOD_ROW = (
    "Gwembe,SPI DJF,Moderate,Window 1,8,9,0.3,0.35,GT,0.3,0.55,2024-25,"
    "2024-08-01,2024-09-01"
)
_GOOD_CSV = "\n".join([_HEADER, _GOOD_ROW]) + "\n"


def _upload(name: str, payload: bytes) -> UploadFile:
    return UploadFile(
        filename=name,
        file=BytesIO(payload),
        headers={"content-type": "text/csv"},
    )


def _request(form: FormData, *, can_manage: bool = True) -> Request:
    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/admin/aa-drought/validate-csv",
        "headers": [],
    }
    request = Request(scope, receive)
    request._form = form  # type: ignore[attr-defined]
    request.state.permission_codes = {"prism.aa_data.manage"} if can_manage else set()
    return request


@pytest.fixture(autouse=True)
def _patch_request_form(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _form(self: Request) -> FormData:
        return self._form  # type: ignore[attr-defined]

    monkeypatch.setattr(Request, "form", _form)


@pytest.mark.asyncio
async def test_validate_csv_upload_success() -> None:
    form = FormData([("csv_content", _upload("aa.csv", _GOOD_CSV.encode()))])
    response = await validate_aa_drought_csv_upload(_request(form))
    assert response.status_code == 200
    payload = json.loads(response.body)
    assert payload["ok"] is True
    assert payload["row_count"] == 1
    assert payload["errors"] == []


@pytest.mark.asyncio
async def test_validate_csv_upload_rejects_invalid_csv() -> None:
    form = FormData([("csv_content", _upload("aa.csv", b"district,index\nA,B\n"))])
    response = await validate_aa_drought_csv_upload(_request(form))
    assert response.status_code == 422
    payload = json.loads(response.body)
    assert payload["ok"] is False
    assert payload["errors"]


@pytest.mark.asyncio
async def test_validate_csv_upload_uses_existing_on_edit() -> None:
    form = FormData([("csv_content__existing", json.dumps(_GOOD_CSV))])
    response = await validate_aa_drought_csv_upload(_request(form))
    assert response.status_code == 200
    payload = json.loads(response.body)
    assert payload["ok"] is True


@pytest.mark.asyncio
async def test_validate_csv_upload_forbidden_without_permission() -> None:
    form = FormData([("csv_content", _upload("aa.csv", _GOOD_CSV.encode()))])
    response = await validate_aa_drought_csv_upload(_request(form, can_manage=False))
    assert response.status_code == 403
