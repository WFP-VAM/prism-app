"""Shared helpers for Starlette Admin batch action forms."""

from __future__ import annotations

from enum import Enum
from html import escape
from typing import Iterable

# Starlette-admin batch actions take pre-rendered HTML for ``form``, not a template
# path. The list page embeds this string in each action link's ``data-form``
# attribute; client JS copies it into the confirmation modal on click.


def bulk_status_select_form(
    choices: Iterable[Enum | str | tuple[str, str]],
    *,
    field_name: str = "status",
    select_id: str = "bulk-status",
    placeholder: str = "Select status…",
) -> str:
    """Return HTML for a bulk status ``<select>`` embedded in a batch action form."""
    option_lines = [f'<option value="">{escape(placeholder)}</option>']
    for choice in choices:
        value, label = _value_and_label(choice)
        option_lines.append(f'<option value="{escape(value)}">{escape(label)}</option>')
    options_html = "\n            ".join(option_lines)
    return f"""
<form>
    <div class="mt-3">
        <label class="form-label" for="{escape(select_id)}">Status</label>
        <select id="{escape(select_id)}" class="form-select" name="{escape(field_name)}" required>
            {options_html}
        </select>
    </div>
</form>
"""


def _value_and_label(choice: Enum | str | tuple[str, str]) -> tuple[str, str]:
    if isinstance(choice, tuple):
        return str(choice[0]), str(choice[1])
    if isinstance(choice, Enum):
        return str(choice.value), str(choice.value)
    return str(choice), str(choice)
