"""Dashboard-related utility functions."""

import re
from typing import Any


def slugify_dashboard_name(name: str) -> str:
    """Lowercase kebab-case slug; stable per country when paired with unique `name`."""
    s = (name or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s


def omit_none_keys(value: Any) -> Any:
    """Recursively drop dict keys with None values (keep list positions intact)."""
    if isinstance(value, dict):
        return {
            key: omit_none_keys(val) for key, val in value.items() if val is not None
        }
    if isinstance(value, list):
        return [omit_none_keys(item) for item in value]
    return value
