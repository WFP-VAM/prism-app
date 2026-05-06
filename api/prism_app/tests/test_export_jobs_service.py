"""Enqueue + dedupe rules for map export jobs (DB + SQS side effects)."""

from __future__ import annotations

import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import Session

from prism_app.database.map_export_job_model import MapExportJob
from prism_app.export_jobs_service import enqueue_map_export_job
from prism_app.models import MapExportRequestModel


@pytest.fixture
def db_session() -> Session:
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
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


def test_enqueue_inserts_queued_and_calls_sqs(db_session: Session) -> None:
    sent: list[str] = []
    req = _sample_request()
    job, status = enqueue_map_export_job(
        db_session,
        req,
        requested_by="alice",
        sqs_send=lambda job_id: sent.append(job_id),
    )
    assert status == 202
    assert job.requested_by == "alice"
    assert job.status == "queued"
    assert len(sent) == 1 and sent[0] == job.id


def test_dedupe_active_job_skips_sqs(db_session: Session) -> None:
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

    sent: list[str] = []
    job, status = enqueue_map_export_job(
        db_session,
        req,
        requested_by="alice",
        sqs_send=lambda job_id: sent.append(job_id),
    )
    assert job.id == existing.id
    assert status == 200
    assert sent == []


def test_dedupe_succeeded_skips_sqs(db_session: Session) -> None:
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

    sent: list[str] = []
    job, status = enqueue_map_export_job(
        db_session,
        req,
        requested_by="alice",
        sqs_send=lambda job_id: sent.append(job_id),
    )
    assert job.id == done.id
    assert status == 200
    assert sent == []


def test_failed_only_allows_new_job_with_sqs(db_session: Session) -> None:
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

    sent: list[str] = []
    job, status = enqueue_map_export_job(
        db_session,
        req,
        requested_by="alice",
        sqs_send=lambda job_id: sent.append(job_id),
    )
    assert job.id != failed.id
    assert status == 202
    assert job.status == "queued"
    assert len(sent) == 1
