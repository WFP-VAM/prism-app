"""API tests for POST /export-map/jobs and GET /export-map/jobs/{id}."""

from __future__ import annotations

import json
import os
from pathlib import Path

# main imports kobo which requires these at import time
os.environ.setdefault("KOBO_USERNAME", "pytest")
os.environ.setdefault("KOBO_PASSWORD", "pytest")

from collections.abc import Generator
from pathlib import Path
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
from prism_app.export_jobs_routes import get_s3_client_for_presign
from prism_app.main import app
from prism_app.models import MapExportRequestModel

_STAGING_MOZ_EXPORT_FIXTURE = (
    Path(__file__).parent / "fixtures" / "staging_moz_export_map_request.json"
)


@pytest.fixture
def staging_moz_export_map_request_body() -> dict[str, Any]:
    return json.loads(_STAGING_MOZ_EXPORT_FIXTURE.read_text(encoding="utf-8"))


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
    SessionLocal = sessionmaker(
        bind=sqlite_engine, class_=Session, expire_on_commit=False
    )

    def override_session() -> Generator[Session, None, None]:
        with SessionLocal() as session:
            yield session

    app.dependency_overrides[get_export_jobs_session] = override_session
    with TestClient(app) as client:
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


def test_get_export_map_job_status(api_client: TestClient) -> None:
    post = api_client.post("/export-map/jobs", json=_body())
    job_id = post.json()["job_id"]
    r = api_client.get(f"/export-map/jobs/{job_id}")
    assert r.status_code == 200
    assert r.json()["status"] == "queued"
    assert r.json()["download_url"] is None


def test_post_export_map_jobs_staging_mozambique_fixture(
    api_client: TestClient,
    staging_moz_export_map_request_body: dict[str, Any],
) -> None:
    # Ensures real-world Firebase preview URLs + MapExportRequestModel validation.
    model = MapExportRequestModel.model_validate(staging_moz_export_map_request_body)
    assert len(model.urls) == 3
    assert model.format == "pdf"
    assert model.viewportWidth == 1200
    assert model.viewportHeight == 1028

    r = api_client.post("/export-map/jobs", json=staging_moz_export_map_request_body)
    assert r.status_code == 202, r.text
    data = r.json()
    assert data["deduplicated"] is False
    assert data["status"] == "queued"
    assert "job_id" in data


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
    mock_s3.head_object.return_value = {}
    app.dependency_overrides[get_s3_client_for_presign] = lambda: mock_s3
    try:
        r = api_client.get(f"/export-map/jobs/{job_id}")
    finally:
        del app.dependency_overrides[get_s3_client_for_presign]
    mock_s3.generate_presigned_url.assert_called_once()

    assert r.status_code == 200
    assert r.json()["download_url"] == "https://example.com/presigned"
    assert r.json()["local_artifact_path"] is None


def test_get_succeeded_file_uri_returns_local_path_skips_presign(
    api_client: TestClient, sqlite_engine, tmp_path: Path
) -> None:
    pdf = tmp_path / "mock-export.pdf"
    pdf.write_bytes(b"%PDF-")
    file_uri = pdf.resolve().as_uri()

    SessionLocal = sessionmaker(
        bind=sqlite_engine, class_=Session, expire_on_commit=False
    )
    with SessionLocal() as session:
        job = MapExportJob(
            request_fingerprint="fp",
            request_payload_json=_body(),
            status="succeeded",
            requested_by="__auth_disabled__",
            s3_uri=file_uri,
            content_type="pdf",
        )
        session.add(job)
        session.commit()
        session.refresh(job)
        job_id = job.id

    mock_s3 = MagicMock()
    app.dependency_overrides[get_s3_client_for_presign] = lambda: mock_s3
    try:
        r = api_client.get(f"/export-map/jobs/{job_id}")
    finally:
        del app.dependency_overrides[get_s3_client_for_presign]
    mock_s3.generate_presigned_url.assert_not_called()

    assert r.status_code == 200
    assert r.json()["download_url"] is None
    assert r.json()["local_artifact_path"] == str(pdf.resolve())
