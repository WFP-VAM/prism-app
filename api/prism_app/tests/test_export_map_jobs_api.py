"""API tests for POST /export-map/jobs and GET /export-map/jobs/{id}."""

from __future__ import annotations

import os

# main imports kobo which requires these at import time
os.environ.setdefault("KOBO_USERNAME", "pytest")
os.environ.setdefault("KOBO_PASSWORD", "pytest")

from collections.abc import Generator
from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import Session

from prism_app.database.map_export_job_model import MapExportJob
from prism_app.export_jobs_db import get_export_jobs_session
from prism_app.export_jobs_routes import get_s3_client_for_presign, get_sqs_send
from prism_app.main import app


@pytest.fixture
def sqlite_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    MapExportJob.__table__.drop(engine, checkfirst=True)
    MapExportJob.__table__.create(engine)
    return engine


@pytest.fixture
def api_client(
    sqlite_engine,
) -> Generator[TestClient, None, None]:
    sqs_calls: list[str] = []

    def fake_sqs(job_id: str) -> None:
        sqs_calls.append(job_id)

    SessionLocal = sessionmaker(
        bind=sqlite_engine, class_=Session, expire_on_commit=False
    )

    def override_session() -> Generator[Session, None, None]:
        with SessionLocal() as session:
            yield session

    app.dependency_overrides[get_export_jobs_session] = override_session
    app.dependency_overrides[get_sqs_send] = lambda: fake_sqs
    with TestClient(app) as client:
        client.sqs_calls = sqs_calls  # type: ignore[attr-defined]
        yield client
    app.dependency_overrides.clear()


def _body() -> dict[str, Any]:
    return {
        "urls": ["http://localhost/?date=2025-01-01"],
        "viewportWidth": 1200,
        "viewportHeight": 849,
        "format": "pdf",
    }


def test_post_export_map_jobs_returns_202_and_enqueues(api_client: TestClient) -> None:
    r = api_client.post("/export-map/jobs", json=_body())
    assert r.status_code == 202, r.text
    data = r.json()
    assert data["deduplicated"] is False
    assert data["status"] == "queued"
    assert "job_id" in data
    assert len(api_client.sqs_calls) == 1  # type: ignore[attr-defined]
    assert api_client.sqs_calls[0] == data["job_id"]  # type: ignore[attr-defined]


def test_get_export_map_job_status(api_client: TestClient) -> None:
    post = api_client.post("/export-map/jobs", json=_body())
    job_id = post.json()["job_id"]
    r = api_client.get(f"/export-map/jobs/{job_id}")
    assert r.status_code == 200
    assert r.json()["status"] == "queued"
    assert r.json()["download_url"] is None


def test_get_succeeded_returns_presigned_url(
    api_client: TestClient, sqlite_engine
) -> None:
    SessionLocal = sessionmaker(
        bind=sqlite_engine, class_=Session, expire_on_commit=False
    )
    with SessionLocal() as session:
        job = MapExportJob(
            request_fingerprint="fp",
            request_payload_json=_body(),
            status="succeeded",
            requested_by="__auth_disabled__",
            s3_uri="s3://mybucket/path/to/file.pdf",
            content_type="pdf",
        )
        session.add(job)
        session.commit()
        session.refresh(job)
        job_id = job.id

    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = "https://example.com/presigned"
    app.dependency_overrides[get_s3_client_for_presign] = lambda: mock_s3
    try:
        r = api_client.get(f"/export-map/jobs/{job_id}")
    finally:
        del app.dependency_overrides[get_s3_client_for_presign]
    mock_s3.generate_presigned_url.assert_called_once()

    assert r.status_code == 200
    assert r.json()["download_url"] == "https://example.com/presigned"
