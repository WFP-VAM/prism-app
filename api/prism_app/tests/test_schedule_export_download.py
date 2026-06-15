"""Tests for schedule export download helpers."""

import datetime
from uuid import uuid4

import pytest
from prism_app.database.map_export_job_model import MapExportJob
from prism_app.export_jobs.schedule_download import (
    latest_succeeded_job_for_schedule,
    schedule_export_download_response,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import Session
from starlette.exceptions import HTTPException
from starlette.responses import RedirectResponse


@pytest.fixture
def db_session() -> Session:
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    MapExportJob.__table__.create(engine)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)
    with SessionLocal() as session:
        yield session
        session.rollback()


def test_latest_succeeded_job_for_schedule_picks_most_recent(
    db_session: Session,
) -> None:
    schedule_id = uuid4()
    older = MapExportJob(
        id="job-old",
        request_fingerprint="fp-old",
        request_payload_json={"urls": ["http://x"], "format": "pdf"},
        status="succeeded",
        s3_uri="s3://b/k/old.pdf",
        map_export_schedule_id=schedule_id,
        finished_at=datetime.datetime(2025, 1, 1, tzinfo=datetime.UTC),
    )
    newer = MapExportJob(
        id="job-new",
        request_fingerprint="fp-new",
        request_payload_json={"urls": ["http://x"], "format": "pdf"},
        status="succeeded",
        s3_uri="s3://b/k/new.pdf",
        map_export_schedule_id=schedule_id,
        finished_at=datetime.datetime(2025, 6, 1, tzinfo=datetime.UTC),
    )
    queued = MapExportJob(
        id="job-q",
        request_fingerprint="fp-q",
        request_payload_json={"urls": ["http://x"], "format": "pdf"},
        status="queued",
        map_export_schedule_id=schedule_id,
    )
    db_session.add_all([older, newer, queued])
    db_session.commit()

    job = latest_succeeded_job_for_schedule(db_session, schedule_id)
    assert job is not None
    assert job.id == "job-new"


def test_schedule_export_download_response_presigns_s3(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    job = MapExportJob(
        id="job-1",
        request_fingerprint="fp",
        request_payload_json={
            "urls": [
                "https://x/?date=2025-01-01&hazardLayerIds=precip",
            ],
            "format": "pdf",
            "country": "mozambique",
        },
        status="succeeded",
        s3_uri="s3://prism-wfp/batch-maps/public_maps/moz/job-1.pdf",
        content_type="pdf",
    )
    mock_s3 = object()

    monkeypatch.setattr(
        "prism_app.export_jobs.schedule_download.map_export_artifact_exists",
        lambda *_a, **_k: True,
    )
    monkeypatch.setattr(
        "prism_app.export_jobs.schedule_download.presign_export_get",
        lambda uri, client, **kw: (
            f"https://signed.example/{uri}?name={kw.get('download_filename')}"
        ),
    )

    response = schedule_export_download_response(job, s3_client=mock_s3)
    assert isinstance(response, RedirectResponse)
    assert response.headers["location"].startswith("https://signed.example/")


def test_schedule_export_download_response_missing_artifact() -> None:
    job = MapExportJob(
        id="job-1",
        request_fingerprint="fp",
        request_payload_json={"urls": ["http://x"], "format": "pdf"},
        status="succeeded",
        s3_uri="s3://b/k/missing.pdf",
    )
    with pytest.raises(HTTPException, match="missing or inaccessible"):
        schedule_export_download_response(job, s3_client=object())
