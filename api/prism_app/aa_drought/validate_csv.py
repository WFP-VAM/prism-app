"""Admin AJAX endpoint: validate an AA drought CSV upload before save."""

from __future__ import annotations

import json
from typing import Any

from prism_app.aa_drought.country_scope import aa_country_scope_error, enforce_aa_country_value
from prism_app.aa_drought.validation import validate_aa_drought_csv
from prism_app.auth.admin_request import request_can_manage_aa_data
from starlette.datastructures import UploadFile
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette_admin.helpers import is_empty_file

_EXISTING_FIELD_SUFFIX = "__existing"


async def validate_aa_drought_csv_upload(request: Request) -> Response:
    """POST multipart CSV (or existing content on edit) → validation JSON."""
    if not request_can_manage_aa_data(request):
        return JSONResponse(
            {"ok": False, "errors": ["Not authorized."]},
            status_code=403,
        )

    form = await request.form()
    scope_err = aa_country_scope_error(request)
    if scope_err:
        return JSONResponse({"ok": False, "errors": [scope_err]}, status_code=403)
    country_val = form.get("country")
    _, country_error = enforce_aa_country_value(
        request,
        str(country_val).strip() if country_val else None,
    )
    if country_error:
        return JSONResponse({"ok": False, "errors": [country_error]}, status_code=403)

    csv_text = await _csv_text_from_form(form)
    if csv_text is None:
        return JSONResponse(
            {"ok": False, "errors": ["Upload a valid CSV file."]},
            status_code=400,
        )

    result = validate_aa_drought_csv(csv_text)
    payload: dict[str, Any] = {
        "ok": result.ok,
        "row_count": result.row_count,
        "errors": result.errors,
    }
    status_code = 200 if result.ok else 422
    return JSONResponse(payload, status_code=status_code)


async def _csv_text_from_form(form: Any) -> str | None:
    file = form.get("csv_content")
    if isinstance(file, UploadFile) and not is_empty_file(file.file):
        try:
            return (await file.read()).decode("utf-8-sig")
        except UnicodeDecodeError:
            return None

    existing = form.get(f"csv_content{_EXISTING_FIELD_SUFFIX}")
    if existing:
        if isinstance(existing, str):
            return json.loads(existing)
        return str(existing)
    return None
