"""API tests for GET /aa/drought/{country}.csv (DB-backed)."""

from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from prism_app.database.aa_drought_model import (
    AaDroughtCountry,
    AaDroughtDatasetModel,
    AaDroughtStatus,
)
from prism_app.main import app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import Session

client = TestClient(app)


@pytest.fixture
def aa_drought_sqlite_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    for column in AaDroughtDatasetModel.__table__.columns:
        column.server_default = None
    AaDroughtDatasetModel.__table__.create(engine)
    return engine


def _seed_published_csv(engine, *, country: str, csv_content: str) -> None:
    SessionLocal = sessionmaker(engine, class_=Session, expire_on_commit=False)
    with SessionLocal() as session:
        session.add(
            AaDroughtDatasetModel(
                country=AaDroughtCountry(country),
                status=AaDroughtStatus.published,
                csv_content=csv_content,
            )
        )
        session.commit()


def _active_db(engine):
    return SimpleNamespace(active=True, engine=engine)


def test_get_aa_drought_csv_503_when_db_inactive() -> None:
    with patch(
        "prism_app.main.alert_db",
        SimpleNamespace(active=False, engine=None),
    ):
        response = client.get("/aa/drought/malawi.csv")
    assert response.status_code == 503
    assert "unavailable" in response.json()["detail"].lower()


def test_get_aa_drought_csv_404_when_no_dataset(aa_drought_sqlite_engine) -> None:
    with patch("prism_app.main.alert_db", _active_db(aa_drought_sqlite_engine)):
        response = client.get("/aa/drought/malawi.csv")
    assert response.status_code == 404


def test_get_aa_drought_csv_redirects_to_fallback(aa_drought_sqlite_engine) -> None:
    fallback = "https://cdn.example/malawi.csv"
    with patch("prism_app.main.alert_db", _active_db(aa_drought_sqlite_engine)):
        response = client.get(
            "/aa/drought/malawi.csv",
            params={"fallback": fallback},
            follow_redirects=False,
        )
    assert response.status_code == 307
    assert response.headers["location"] == fallback


def test_get_aa_drought_csv_returns_published_csv(aa_drought_sqlite_engine) -> None:
    csv_text = "district,index\nA,B\n"
    _seed_published_csv(
        aa_drought_sqlite_engine,
        country="malawi",
        csv_content=csv_text,
    )
    with patch("prism_app.main.alert_db", _active_db(aa_drought_sqlite_engine)):
        response = client.get("/aa/drought/malawi.csv")
    assert response.status_code == 200
    assert response.text == csv_text
    assert response.headers["content-type"].startswith("text/csv")


def test_get_aa_drought_csv_prefers_staging_when_requested(
    aa_drought_sqlite_engine,
) -> None:
    published = "published\n"
    staging = "staging\n"
    SessionLocal = sessionmaker(
        aa_drought_sqlite_engine, class_=Session, expire_on_commit=False
    )
    with SessionLocal() as session:
        session.add(
            AaDroughtDatasetModel(
                country=AaDroughtCountry.malawi,
                status=AaDroughtStatus.published,
                csv_content=published,
            )
        )
        session.add(
            AaDroughtDatasetModel(
                country=AaDroughtCountry.malawi,
                status=AaDroughtStatus.staging,
                csv_content=staging,
            )
        )
        session.commit()

    with patch("prism_app.main.alert_db", _active_db(aa_drought_sqlite_engine)):
        response = client.get(
            "/aa/drought/malawi.csv",
            params={"include_staging": "true"},
        )
    assert response.status_code == 200
    assert response.text == staging
