"""API tests for POST /export-map/jobs and GET /export-map/jobs/{id}."""

from __future__ import annotations

from collections.abc import Generator
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from prism_app.database.map_export_job_model import MapExportJob
from prism_app.export_jobs.db import get_export_jobs_session
from prism_app.export_jobs.routes import get_s3_client_for_presign
from prism_app.main import app
from prism_app.models import MapExportRequestModel
from prism_app.tests.fixtures.moz_export import (
    MAP_EXPORT_FIXTURE_BASE_URL,
    moz_export_map_request_dict,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import Session


@pytest.fixture
def moz_export_map_request_body() -> dict[str, Any]:
    return moz_export_map_request_dict()


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
        "urls": ["http://localhost/?hazardLayerIds=precip&date=2025-01-01"],
        "viewportWidth": 1200,
        "viewportHeight": 849,
        "format": "pdf",
        "country": "TestPlace",
    }


def test_post_export_map_jobs_returns_202_and_enqueues(api_client: TestClient) -> None:
    r = api_client.post("/export-map/jobs", json=_body())
    assert r.status_code == 202, r.text
    data = r.json()
    assert data["deduplicated"] is False
    assert data["status"] == "queued"
    assert "job_id" in data
    assert data["origin_url"] == "http://localhost"


def test_post_export_map_jobs_strips_public_upload_flag(
    api_client: TestClient, sqlite_engine
) -> None:
    body = {
        **_body(),
        "urls": ["http://localhost/?date=2025-01-01&hazardLayerIds=layer_a"],
        "publicMapUpload": True,
    }
    r = api_client.post("/export-map/jobs", json=body)
    assert r.status_code == 202, r.text
    job_id = r.json()["job_id"]
    SessionLocal = sessionmaker(
        bind=sqlite_engine, class_=Session, expire_on_commit=False
    )
    with SessionLocal() as session:
        job = session.get(MapExportJob, job_id)
        assert job is not None
        assert job.request_payload_json.get("publicMapUpload") is False


def test_get_export_map_job_status(api_client: TestClient) -> None:
    post = api_client.post("/export-map/jobs", json=_body())
    job_id = post.json()["job_id"]
    r = api_client.get(f"/export-map/jobs/{job_id}")
    assert r.status_code == 200
    assert r.json()["status"] == "queued"
    assert r.json()["download_url"] is None
    assert r.json()["origin_url"] == "http://localhost"
    assert r.json()["download_filename"] == "TestPlace_precip_2025_01_01.pdf"


def test_post_export_map_jobs_mozambique_fixture(
    api_client: TestClient,
    moz_export_map_request_body: dict[str, Any],
) -> None:
    # Ensures real-world Firebase preview URLs + MapExportRequestModel validation.
    model = MapExportRequestModel.model_validate(moz_export_map_request_body)
    assert len(model.urls) == 3
    assert model.format == "pdf"
    assert model.viewportWidth == 1200
    assert model.viewportHeight == 1028

    r = api_client.post("/export-map/jobs", json=moz_export_map_request_body)
    assert r.status_code == 202, r.text
    data = r.json()
    assert data["deduplicated"] is False
    assert data["status"] == "queued"
    assert "job_id" in data
    assert data["origin_url"] == MAP_EXPORT_FIXTURE_BASE_URL


def test_post_export_map_jobs_returns_422_when_too_many_urls(
    api_client: TestClient,
) -> None:
    urls = [f"http://localhost/?date=2025-01-{i:02d}" for i in range(1, 14)]
    r = api_client.post("/export-map/jobs", json={**_body(), "urls": urls})
    assert r.status_code == 422, r.text


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
            origin_url=None,
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
    _gc_args, gc_kw = mock_s3.generate_presigned_url.call_args
    assert "attachment" in gc_kw["Params"]["ResponseContentDisposition"]

    assert r.status_code == 200
    j = r.json()
    assert j["download_url"] == "https://example.com/presigned"
    assert j["download_filename"] == "TestPlace_precip_2025_01_01.pdf"
    assert j["local_artifact_path"] is None


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
            origin_url=None,
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
    j = r.json()
    assert j["download_url"] is None
    assert j["local_artifact_path"] == str(pdf.resolve())
    assert j["download_filename"] == "TestPlace_precip_2025_01_01.pdf"


def test_delete_export_map_job_cancels_queued(api_client: TestClient) -> None:
    post = api_client.post("/export-map/jobs", json=_body())
    assert post.status_code == 202
    job_id = post.json()["job_id"]
    r = api_client.delete(f"/export-map/jobs/{job_id}")
    assert r.status_code == 204
    assert api_client.delete(f"/export-map/jobs/{job_id}").status_code == 204
    g = api_client.get(f"/export-map/jobs/{job_id}")
    assert g.status_code == 200
    assert g.json()["status"] == "cancelled"


def test_delete_export_map_job_missing_returns_404(api_client: TestClient) -> None:
    fake_id = "00000000-0000-4000-b000-000000000012"
    r = api_client.delete(f"/export-map/jobs/{fake_id}")
    assert r.status_code == 404


def test_delete_running_export_job_returns_409(
    api_client: TestClient, sqlite_engine
) -> None:
    SessionLocal = sessionmaker(
        bind=sqlite_engine, class_=Session, expire_on_commit=False
    )
    with SessionLocal() as session:
        job = MapExportJob(
            request_fingerprint="fp-run",
            request_payload_json=_body(),
            status="running",
            origin_url=None,
            content_type="pdf",
        )
        session.add(job)
        session.commit()
        session.refresh(job)
        job_id = job.id

    r = api_client.delete(f"/export-map/jobs/{job_id}")
    assert r.status_code == 409
