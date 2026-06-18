"""Environment for alert workers."""

from __future__ import annotations

import os

DEFAULT_PUBLIC_API_URL = "https://prism-api.ovio.org"


def api_base_url() -> str:
    """URL for ``POST /stats`` and deactivate links (same as Node ``API_URL``)."""
    return (os.environ.get("API_URL") or DEFAULT_PUBLIC_API_URL).rstrip("/")


def alerts_database_url() -> str | None:
    return os.environ.get("PRISM_ALERTS_DATABASE_URL")


def aa_alert_country() -> str:
    return os.environ.get("AA_ALERT_COUNTRY") or "mozambique"


def http_verify_ssl() -> bool:
    return os.environ.get("PRISM_ALERT_HTTP_VERIFY_SSL", "true").lower() in (
        "1",
        "true",
        "yes",
    )


def is_production() -> bool:
    """Match ``PRISM_ENV`` checks in ``prism_app.auth.admin_settings``."""
    return os.getenv("PRISM_ENV", "").strip().lower() in {"production", "prod"}
