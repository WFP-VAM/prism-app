"""URL slug for dashboard rows (aligned with frontend kebab-case titles)."""

import re


def slugify_dashboard_name(name: str) -> str:
    """Lowercase kebab-case slug; stable per country when paired with unique `name`."""
    s = (name or "").strip().lower()
    if not s:
        return "untitled-dashboard"
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s or "untitled-dashboard"
