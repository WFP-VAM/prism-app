"""Starlette Admin field: upload dashboard config as a JSON file."""

import json
from dataclasses import dataclass
from json import JSONDecodeError
from typing import Any

from starlette.datastructures import FormData, UploadFile
from starlette.requests import Request
from starlette_admin._types import RequestAction
from starlette_admin.fields import BaseField, JSONField
from starlette_admin.helpers import html_params, is_empty_file

_JSON_ACCEPT = ".json,application/json"
_JSON_CONTENT_TYPES = frozenset(
    {
        "application/json",
        "text/json",
        "application/octet-stream",
    }
)
_EXISTING_FIELD_SUFFIX = "__existing"
_JSON_DISPLAY_INDENT = 2


def format_dashboard_config_json_for_display(data: Any) -> str:
    """Pretty-print dashboard config for admin detail and edit previews."""
    if data is None:
        return ""
    return json.dumps(
        data,
        indent=_JSON_DISPLAY_INDENT,
        ensure_ascii=False,
        default=str,
    )


def _is_json_upload(file: UploadFile) -> bool:
    filename = (file.filename or "").strip().lower()
    if filename and not filename.endswith(".json"):
        return False
    content_type = (file.content_type or "").strip().lower()
    if content_type and content_type not in _JSON_CONTENT_TYPES:
        return False
    return True


@dataclass
class PrettyJSONField(JSONField):
    """Model JSON column with the same indented display as dashboard config."""

    display_template: str = "displays/dashboard_config_json.html"

    def format_display(self, data: Any) -> str:
        return format_dashboard_config_json_for_display(data)


@dataclass
class DashboardConfigJsonFileField(BaseField):
    """Upload a dashboard configuration JSON file (drag-and-drop or browse)."""

    accept: str = _JSON_ACCEPT
    form_template: str = "forms/dashboard_config_json_file.html"
    display_template: str = "displays/dashboard_config_json.html"
    render_function_key: str = "json"

    def format_display(self, data: Any) -> str:
        return format_dashboard_config_json_for_display(data)

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
            if not _is_json_upload(file):
                return None
            try:
                payload = (await file.read()).decode("utf-8")
            except UnicodeDecodeError:
                return None
            try:
                return json.loads(payload)
            except JSONDecodeError:
                return None

        if action == RequestAction.EDIT:
            existing = form_data.get(f"{self.id}{_EXISTING_FIELD_SUFFIX}")
            if existing:
                try:
                    return json.loads(existing)
                except JSONDecodeError:
                    return None
        return None
