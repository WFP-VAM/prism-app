"""Enqueue + dedupe rules for map export jobs."""

from __future__ import annotations

import datetime

from unittest.mock import MagicMock

from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import Session

from prism_app.database.map_export_job_model import MapExportJob
from prism_app.export_jobs_service import enqueue_map_export_job
from prism_app.models import MapExportRequestModel


@pytest.fixture
def db_session() -> Session:
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    MapExportJob.__table__.create(engine)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)
    with SessionLocal() as session:
        yield session
        session.rollback()


def _sample_request() -> MapExportRequestModel:
    return MapExportRequestModel(
        urls=["http://localhost/?date=2025-01-01"],
        viewportWidth=1200,
        viewportHeight=849,
        format="pdf",
    )


def test_enqueue_inserts_queued(db_session: Session) -> None:
    req = _sample_request()
    job, status = enqueue_map_export_job(db_session, req, requested_by="alice")
    assert status == 202
    assert job.requested_by == "alice"
    assert job.status == "queued"


def test_dedupe_active_job(db_session: Session) -> None:
    req = _sample_request()
    from prism_app.export_job_fingerprint import compute_request_fingerprint

    fp = compute_request_fingerprint(req, "alice")
    existing = MapExportJob(
        request_fingerprint=fp,
        request_payload_json=req.model_dump(mode="json"),
        status="queued",
        requested_by="alice",
    )
    db_session.add(existing)
    db_session.commit()

    job, status = enqueue_map_export_job(db_session, req, requested_by="alice")
    assert job.id == existing.id
    assert status == 200


def test_dedupe_succeeded(db_session: Session) -> None:
    req = _sample_request()
    from prism_app.export_job_fingerprint import compute_request_fingerprint

    fp = compute_request_fingerprint(req, "alice")
    done = MapExportJob(
        request_fingerprint=fp,
        request_payload_json=req.model_dump(mode="json"),
        status="succeeded",
        requested_by="alice",
        s3_uri="s3://b/k",
        content_type="pdf",
        finished_at=datetime.datetime.now(datetime.UTC),
    )
    db_session.add(done)
    db_session.commit()

    mock_s3 = MagicMock()
    mock_s3.head_object.return_value = {}

    job, status = enqueue_map_export_job(
        db_session, req, requested_by="alice", s3_client=mock_s3
    )
    assert job.id == done.id
    assert status == 200
    mock_s3.head_object.assert_called_once()


def test_dedupe_succeeded_requeues_when_s3_object_missing(db_session: Session) -> None:
    req = _sample_request()
    from prism_app.export_job_fingerprint import compute_request_fingerprint

    fp = compute_request_fingerprint(req, "alice")
    done = MapExportJob(
        request_fingerprint=fp,
        request_payload_json=req.model_dump(mode="json"),
        status="succeeded",
        requested_by="alice",
        s3_uri="s3://b/k",
        content_type="pdf",
        finished_at=datetime.datetime.now(datetime.UTC),
    )
    db_session.add(done)
    db_session.commit()
    done_id = done.id

    mock_s3 = MagicMock()
    mock_s3.head_object.side_effect = OSError("no such key")

    job, status = enqueue_map_export_job(
        db_session, req, requested_by="alice", s3_client=mock_s3
    )
    assert status == 202
    assert job.status == "queued"
    assert job.id != done_id

    db_session.refresh(done)
    assert done.status == "failed"
    assert done.s3_uri is None


def test_dedupe_succeeded_requeues_when_local_file_missing(
    db_session: Session, tmp_path: Path
) -> None:
    req = _sample_request()
    from prism_app.export_job_fingerprint import compute_request_fingerprint

    fp = compute_request_fingerprint(req, "alice")
    pdf = tmp_path / "gone.pdf"
    pdf.write_bytes(b"%PDF")
    uri = pdf.resolve().as_uri()
    done = MapExportJob(
        request_fingerprint=fp,
        request_payload_json=req.model_dump(mode="json"),
        status="succeeded",
        requested_by="alice",
        s3_uri=uri,
        content_type="pdf",
        finished_at=datetime.datetime.now(datetime.UTC),
    )
    db_session.add(done)
    db_session.commit()
    pdf.unlink()

    job, status = enqueue_map_export_job(db_session, req, requested_by="alice")
    assert status == 202
    assert job.status == "queued"
    db_session.refresh(done)
    assert done.status == "failed"


def test_failed_allows_new_job(db_session: Session) -> None:
    req = _sample_request()
    from prism_app.export_job_fingerprint import compute_request_fingerprint

    fp = compute_request_fingerprint(req, "alice")
    failed = MapExportJob(
        request_fingerprint=fp,
        request_payload_json=req.model_dump(mode="json"),
        status="failed",
        requested_by="alice",
        error_json={"message": "x"},
    )
    db_session.add(failed)
    db_session.commit()

    job, status = enqueue_map_export_job(db_session, req, requested_by="alice")
    assert job.id != failed.id
    assert status == 202
    assert job.status == "queued"
