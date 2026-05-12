"""Dashboard-related utility functions."""

import re
from typing import Any


def slugify_dashboard_path_part(name: str) -> str:
    """Lowercase kebab-case path segment from a dashboard title or deployment."""
    s = (name or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s


def build_dashboard_path(title: str, deployment: str) -> str:
    """Build stored dashboard path, prefixed by deployment."""
    base = slugify_dashboard_path_part(title) or "dashboard"
    deployment_part = slugify_dashboard_path_part(deployment)
    if not deployment_part:
        raise ValueError("deployment is required to build dashboard path")
    return f"{deployment_part}-{base}"


def omit_none_keys(value: Any) -> Any:
    """Recursively drop dict keys with None values (keep list positions intact)."""
    if isinstance(value, dict):
        return {
            key: omit_none_keys(val) for key, val in value.items() if val is not None
        }
    if isinstance(value, list):
        return [omit_none_keys(item) for item in value]
    return value
