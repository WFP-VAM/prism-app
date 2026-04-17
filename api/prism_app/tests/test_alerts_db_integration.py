"""Integration checks for the alerts Postgres DB and read-only Starlette Admin."""

import os

import pytest
from fastapi.testclient import TestClient
from prism_app.main import app
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import SQLAlchemyError

client = TestClient(app)


@pytest.fixture(scope="module")
def alerts_db_url() -> str:
    url = os.getenv("PRISM_ALERTS_DATABASE_URL")
    if not url:
        pytest.skip("PRISM_ALERTS_DATABASE_URL not set")
    engine = create_engine(url, connect_args={"connect_timeout": 3})
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        pytest.skip(
            f"Alerts database unreachable (check PRISM_ALERTS_DATABASE_URL): {exc}",
        )
    finally:
        engine.dispose()
    return url


def test_public_alerts_tables_exist(alerts_db_url: str) -> None:
    """Baseline tables from Alembic / alerting workers must be present."""
    engine = create_engine(alerts_db_url)
    insp = inspect(engine)
    names = set(insp.get_table_names(schema="public"))
    assert "alert" in names
    assert "user_info" in names
    assert "anticipatory_action_alerts" in names


def test_alembic_reached_baseline_or_newer(alerts_db_url: str) -> None:
    """Ensures migrations were applied (alembic_version row present)."""
    engine = create_engine(alerts_db_url)
    with engine.connect() as conn:
        version = conn.execute(
            text(
                "SELECT version_num FROM alembic_version LIMIT 1",
            ),
        ).scalar_one_or_none()
    assert version is not None, "Run alembic upgrade head against this database"


def test_admin_mount_and_list_routes(alerts_db_url: str) -> None:
    """Read-only admin is mounted; list pages respond (empty DB is ok)."""
    _ = alerts_db_url  # admin shares same DB_URI as fixtures above
    r = client.get("/admin/")
    assert r.status_code in (200, 302, 307, 303)
    # Identity slugs come from SQLModel class names (see admin index sidebar).
    for path in (
        "/admin/alert-model/list",
        "/admin/user-info-model/list",
        "/admin/anticipatory-action-alerts/list",
    ):
        lr = client.get(path)
        assert lr.status_code in (
            200,
            302,
            303,
            307,
        ), f"unexpected for {path}: {lr.status_code}"
