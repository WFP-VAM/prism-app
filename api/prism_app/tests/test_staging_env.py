"""Staging env override refuses the prod alerts database."""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
PROD_URL = "postgresql://user:secret@alerts.example:5432/prism"


def _bash(body: str, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    merged = os.environ.copy()
    merged.pop("PRISM_STAGING", None)
    merged.pop("MAIL_SUBJECT_PREFIX", None)
    if env:
        merged.update(env)
    return subprocess.run(
        ["bash", "-c", body],
        cwd=ROOT,
        env=merged,
        capture_output=True,
        text=True,
        check=False,
    )


def test_staging_override_uses_local_db_and_keeps_production_env() -> None:
    result = _bash(
        """
        source scripts/staging_env.sh
        staging_apply_overrides
        printf '%s\\n' \\
          "$PRISM_ALERTS_DATABASE_URL" \\
          "$HOSTNAME" \\
          "$EXPORT_MAP_S3_BUCKET" \\
          "$API_URL" \\
          "$PRISM_OIDC_REDIRECT_URI" \\
          "$MAIL_SUBJECT_PREFIX" \\
          "$PRISM_ENV" \\
          "$COMPOSE_PROJECT_NAME"
        """,
        {"PRISM_ALERTS_DATABASE_URL": PROD_URL, "PRISM_ENV": "production"},
    )
    assert result.returncode == 0, result.stderr
    lines = result.stdout.splitlines()
    assert lines == [
        "postgresql://postgres:!ChangeMe!@db:5432/postgres",
        "prism-api-staging.ovio.org",
        "s3://prism-wfp/batch-maps-staging",
        "https://prism-api-staging.ovio.org",
        "https://prism-api-staging.ovio.org/auth/callback",
        "[STAGING] ",
        "production",
        "prism-staging",
    ]


def test_staging_refuses_when_url_still_matches_prod() -> None:
    result = _bash(
        f"""
        source scripts/staging_env.sh
        staging_assert_db_isolated {PROD_URL!r} {PROD_URL!r}
        """,
    )
    assert result.returncode != 0
    assert "still matches prod" in result.stderr


def test_staging_refuses_non_db_host() -> None:
    result = _bash(
        """
        source scripts/staging_env.sh
        staging_assert_db_isolated \\
          'postgresql://user:secret@alerts.example:5432/prism' \\
          'postgresql://user:secret@other:5432/prism'
        """,
    )
    assert result.returncode != 0
    assert "host must be db" in result.stderr


def test_staging_refuses_empty_prod_url() -> None:
    result = _bash(
        """
        source scripts/staging_env.sh
        staging_apply_overrides
        """,
        {"PRISM_ALERTS_DATABASE_URL": ""},
    )
    assert result.returncode != 0
    assert "empty" in result.stderr


@pytest.mark.parametrize(
    "url, host",
    [
        ("postgresql://postgres:!ChangeMe!@db:5432/postgres", "db"),
        ("postgresql://user:secret@alerts.example:5432/prism", "alerts.example"),
    ],
)
def test_staging_db_host(url: str, host: str) -> None:
    result = _bash(
        f"""
        source scripts/staging_env.sh
        staging_db_host {url!r}
        """,
    )
    assert result.returncode == 0, result.stderr
    assert result.stdout == host
