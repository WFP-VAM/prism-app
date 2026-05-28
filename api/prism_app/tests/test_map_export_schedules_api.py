"""API tests for POST /export-map/schedules."""

from __future__ import annotations

from collections.abc import Generator
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from prism_app.auth.deps import require_prism_session
from prism_app.auth.permission_codes import ADMIN_ACCESS, MAP_EXPORTS_MANAGE
from prism_app.database.map_export_schedule_model import MapExportSchedule
from prism_app.database.user_model import User
from prism_app.export_jobs.db import get_export_jobs_session
from prism_app.main import app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import Session

_SAMPLE_EXPORT_URL = (
    "http://localhost/export?"
    "bounds=24.99,-29.08,38.85,-10.74&"
    "zoom=4.16&"
    "aspectRatio=A4-P&"
    "title=Mozambique%3A+%7Bdate_coverage%7D&"
    "date={date}&"
    "hazardLayerIds={layer_id}"
)


@pytest.fixture
def sqlite_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    MapExportSchedule.__table__.drop(engine, checkfirst=True)
    MapExportSchedule.__table__.create(engine)
    return engine


@pytest.fixture
def api_client(sqlite_engine) -> Generator[TestClient, None, None]:
    SessionLocal = sessionmaker(
        bind=sqlite_engine, class_=Session, expire_on_commit=False
    )

    def override_session() -> Generator[Session, None, None]:
        with SessionLocal() as session:
            yield session

    user = User.model_construct(
        id=UUID("00000000-0000-4000-8000-000000000123"),
        ciam_sub="ciam-sub",
        email="scheduler@example.org",
        name="Scheduler User",
    )

    def override_prism_session() -> tuple[User, set[str]]:
        return user, {MAP_EXPORTS_MANAGE}

    app.dependency_overrides[get_export_jobs_session] = override_session
    app.dependency_overrides[require_prism_session] = override_prism_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def api_client_without_permission(sqlite_engine) -> Generator[TestClient, None, None]:
    SessionLocal = sessionmaker(
        bind=sqlite_engine, class_=Session, expire_on_commit=False
    )

    def override_session() -> Generator[Session, None, None]:
        with SessionLocal() as session:
            yield session

    user = User.model_construct(
        id=UUID("00000000-0000-4000-8000-000000000124"),
        ciam_sub="ciam-sub-no-permission",
        email="viewer@example.org",
        name="Viewer User",
    )

    def override_prism_session() -> tuple[User, set[str]]:
        return user, set()

    app.dependency_overrides[get_export_jobs_session] = override_session
    app.dependency_overrides[require_prism_session] = override_prism_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def _schedule_body() -> dict[str, object]:
    return {
        "name": "Mozambique: {date_coverage}",
        "country": "mozambique",
        "layer_id": "precip_blended_dekad",
        "cadence": "monthly",
        "dekad_interval": 1,
        "format": "pdf",
        "export_url": _SAMPLE_EXPORT_URL,
        "export_options": {
            "origin": "http://localhost",
            "exportPath": "/export",
            "queryParams": {
                "bounds": "24.99,-29.08,38.85,-10.74",
                "zoom": "4.16",
                "aspectRatio": "A4-P",
                "title": "Mozambique: {date_coverage}",
                "surprise": "allowed-in-opaque-blob",
            },
            "viewportWidth": 1200,
            "viewportHeight": 1697,
        },
    }


def test_post_export_map_schedule_creates_active_owned_schedule(
    api_client: TestClient,
    sqlite_engine,
) -> None:
    response = api_client.post("/export-map/schedules", json=_schedule_body())

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["status"] == "active"
    assert payload["name"] == "Mozambique: {date_coverage}"
    assert payload["export_url"] == _SAMPLE_EXPORT_URL

    SessionLocal = sessionmaker(
        bind=sqlite_engine,
        class_=Session,
        expire_on_commit=False,
    )
    with SessionLocal() as session:
        schedule = session.get(MapExportSchedule, UUID(payload["schedule_id"]))
        assert schedule is not None
        assert schedule.status == "active"
        assert schedule.created_by_user_id == UUID(
            "00000000-0000-4000-8000-000000000123"
        )
        assert schedule.export_url == _SAMPLE_EXPORT_URL
        assert schedule.export_options["viewportWidth"] == 1200
        assert (
            schedule.export_options["queryParams"]["surprise"]
            == "allowed-in-opaque-blob"
        )


def test_post_export_map_schedule_stores_client_export_url_unchanged(
    api_client: TestClient,
) -> None:
    body = _schedule_body()
    body["export_url"] = (
        "http://localhost/export?date={date}&hazardLayerIds={layer_id}&language=pt"
    )

    response = api_client.post("/export-map/schedules", json=body)

    assert response.status_code == 201, response.text
    assert response.json()["export_url"] == body["export_url"]
    assert "language=pt" in response.json()["export_url"]


def test_post_export_map_schedule_accepts_png_format(
    api_client: TestClient,
    sqlite_engine,
) -> None:
    body = _schedule_body()
    body["format"] = "png"

    response = api_client.post("/export-map/schedules", json=body)

    assert response.status_code == 201, response.text
    assert response.json()["name"] == "Mozambique: {date_coverage}"
    SessionLocal = sessionmaker(
        bind=sqlite_engine,
        class_=Session,
        expire_on_commit=False,
    )
    with SessionLocal() as session:
        schedule = session.get(
            MapExportSchedule,
            UUID(response.json()["schedule_id"]),
        )
        assert schedule is not None
        assert schedule.format == "png"


def test_post_export_map_schedule_rejects_export_url_missing_placeholders(
    api_client: TestClient,
) -> None:
    body = _schedule_body()
    body["export_url"] = "http://localhost/export?date=2000-01-01"

    response = api_client.post("/export-map/schedules", json=body)

    assert response.status_code == 422


def test_post_export_map_schedule_requires_map_exports_permission(
    api_client_without_permission: TestClient,
) -> None:
    response = api_client_without_permission.post(
        "/export-map/schedules",
        json=_schedule_body(),
    )

    assert response.status_code == 403


def test_post_export_map_schedule_allows_admin_access_without_map_exports_manage(
    sqlite_engine,
) -> None:
    SessionLocal = sessionmaker(
        bind=sqlite_engine, class_=Session, expire_on_commit=False
    )

    def override_session() -> Generator[Session, None, None]:
        with SessionLocal() as session:
            yield session

    user = User.model_construct(
        id=UUID("00000000-0000-4000-8000-000000000125"),
        ciam_sub="ciam-sub-admin",
        email="admin@example.org",
        name="Admin User",
    )

    def override_prism_session() -> tuple[User, set[str]]:
        return user, {ADMIN_ACCESS}

    app.dependency_overrides[get_export_jobs_session] = override_session
    app.dependency_overrides[require_prism_session] = override_prism_session
    try:
        with TestClient(app) as client:
            response = client.post("/export-map/schedules", json=_schedule_body())
        assert response.status_code == 201, response.text
    finally:
        app.dependency_overrides.clear()


def test_export_map_schedules_does_not_expose_prism_list_api(
    api_client: TestClient,
) -> None:
    response = api_client.get("/export-map/schedules")

    assert response.status_code == 405
