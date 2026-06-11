"""Starlette Admin field: upload an AA drought dataset as a raw CSV file.

Unlike the dashboard JSON field this keeps the upload as raw text — the CSV is
served back to the frontend verbatim, so we never round-trip it through a
parser that could reorder columns or drop the leading unnamed index column some
country exports carry.
"""

import json
from dataclasses import dataclass
from typing import Any

from starlette.datastructures import FormData, UploadFile
from starlette.requests import Request
from starlette_admin._types import RequestAction
from starlette_admin.fields import BaseField
from starlette_admin.helpers import html_params, is_empty_file

_CSV_ACCEPT = ".csv,text/csv"
_CSV_CONTENT_TYPES = frozenset(
    {
        "text/csv",
        "application/csv",
        "application/vnd.ms-excel",
        "text/plain",
        "application/octet-stream",
    }
)
_EXISTING_FIELD_SUFFIX = "__existing"
_PREVIEW_MAX_LINES = 80


def format_aa_drought_csv_for_display(data: Any) -> str:
    """Truncated CSV preview for admin detail and edit views."""
    if not data:
        return ""
    text = data if isinstance(data, str) else str(data)
    lines = text.splitlines()
    if len(lines) <= _PREVIEW_MAX_LINES:
        return text
    shown = lines[:_PREVIEW_MAX_LINES]
    remaining = len(lines) - _PREVIEW_MAX_LINES
    shown.append(f"… ({remaining} more rows)")
    return "\n".join(shown)


def _is_csv_upload(file: UploadFile) -> bool:
    filename = (file.filename or "").strip().lower()
    if filename and not filename.endswith(".csv"):
        return False
    content_type = (file.content_type or "").strip().lower()
    if content_type and content_type not in _CSV_CONTENT_TYPES:
        return False
    return True


@dataclass
class AaDroughtCsvFileField(BaseField):
    """Upload an AA drought probabilities/triggers CSV file (drag-and-drop or browse)."""

    accept: str = _CSV_ACCEPT
    form_template: str = "forms/aa_drought_csv_file.html"
    display_template: str = "displays/aa_drought_csv.html"

    def format_display(self, data: Any) -> str:
        return format_aa_drought_csv_for_display(data)

    def input_params(self) -> str:
        return html_params(
            {
                "accept": self.accept,
                "disabled": self.disabled,
                "readonly": self.read_only,
            }
        )

    async def parse_form_data(
        self, request: Request, form_data: FormData, action: RequestAction
    ) -> Any:
        file = form_data.get(self.id)
        if isinstance(file, UploadFile) and not is_empty_file(file.file):
            if not _is_csv_upload(file):
                return None
            try:
                return (await file.read()).decode("utf-8-sig")
            except UnicodeDecodeError:
                return None

        if action == RequestAction.EDIT:
            existing = form_data.get(f"{self.id}{_EXISTING_FIELD_SUFFIX}")
            if existing:
                try:
                    return json.loads(existing)
                except json.JSONDecodeError:
                    return existing
        return None
