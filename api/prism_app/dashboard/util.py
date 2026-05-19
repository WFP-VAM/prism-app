"""Dashboard-related utility functions."""

import re
from typing import Any


def slugify_dashboard_path_part(name: str) -> str:
    """Lowercase kebab-case path segment from a dashboard title or country."""
    s = (name or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s


def build_dashboard_path(title: str, country: str) -> str:
    """Build stored dashboard path, prefixed by country."""
    base = slugify_dashboard_path_part(title) or "dashboard"
    country_part = slugify_dashboard_path_part(country)
    if not country_part:
        raise ValueError("country is required to build dashboard path")
    return f"{country_part}-{base}"


def omit_none_keys(value: Any) -> Any:
    """Recursively drop dict keys with None values (keep list positions intact)."""
    if isinstance(value, dict):
        return {
            key: omit_none_keys(val) for key, val in value.items() if val is not None
        }
    if isinstance(value, list):
        return [omit_none_keys(item) for item in value]
    return value
