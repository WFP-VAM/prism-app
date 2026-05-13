"""Scheduler firing and scheduled enqueue behavior."""

from __future__ import annotations

import datetime
import logging
from unittest.mock import MagicMock

import pytest
from prism_app.database.map_export_job_model import MapExportJob
from prism_app.database.map_export_schedule_model import MapExportSchedule
from prism_app.export_jobs.fingerprint import compute_request_fingerprint
from prism_app.export_jobs.schedule_service import (
    enqueue_scheduled_map_export_job,
    refresh_schedule_next_run_at,
)
from prism_app.export_jobs.scheduler import (
    SCHEDULE_FIRE_MAX_ATTEMPTS,
    fire_due_map_export_schedules,
    fire_next_due_map_export_schedule,
)
from prism_app.export_jobs.service import enqueue_map_export_job
from prism_app.models import MapExportRequestModel
from prism_app.tests.fixtures.moz_export import (
    moz_export_map_request_dict,
    moz_export_schedule_urls_text,
)
from prism_app.utils import utc_now
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, select


@pytest.fixture
def schedule_job_session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    MapExportSchedule.__table__.create(engine)
    MapExportJob.__table__.create(engine)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
        MapExportJob.__table__.drop(engine, checkfirst=True)
        MapExportSchedule.__table__.drop(engine, checkfirst=True)


def _sample_request() -> MapExportRequestModel:
    return MapExportRequestModel.model_validate(moz_export_map_request_dict())


def _add_due_schedule(
    session: Session,
    *,
    max_runs: int = 2,
    runs_completed: int = 0,
    payload: str | None = None,
) -> MapExportSchedule:
    schedule = MapExportSchedule(
        name="due",
        cron_expression="0 6 * * *",
        batch_map_url=(moz_export_schedule_urls_text() if payload is None else payload),
        max_runs=max_runs,
        runs_completed=runs_completed,
        next_run_at=utc_now() - datetime.timedelta(seconds=30),
    )
    session.add(schedule)
    session.commit()
    session.refresh(schedule)
    return schedule


def test_scheduled_enqueue_inserts_despite_succeeded_duplicate(
    schedule_job_session: Session,
) -> None:
    req = _sample_request()
    schedule = _add_due_schedule(schedule_job_session, max_runs=3)
    prior = MapExportJob(
        request_fingerprint=compute_request_fingerprint(req),
        request_payload_json=req.model_dump(mode="json"),
        status="succeeded",
        origin_url="https://prism.moz.wfp.org",
        s3_uri="s3://bucket/map_exports/prior.pdf",
        content_type="pdf",
        finished_at=utc_now(),
    )
    schedule_job_session.add(prior)
    schedule_job_session.commit()

    mock_s3 = MagicMock()
    mock_s3.head_object.return_value = {}
    job, status = enqueue_map_export_job(
        schedule_job_session,
        req,
        s3_client=mock_s3,
    )
    assert status == 200
    assert job.id == prior.id

    scheduled = enqueue_scheduled_map_export_job(schedule_job_session, schedule, req)
    schedule_job_session.commit()

    assert scheduled.id != prior.id
    assert scheduled.status == "queued"
    assert scheduled.schedule_id == schedule.id


def test_fire_next_due_schedule_enqueues_job_and_advances_schedule(
    schedule_job_session: Session,
) -> None:
    schedule = _add_due_schedule(schedule_job_session, max_runs=2)
    previous_next_run = schedule.next_run_at

    assert fire_next_due_map_export_schedule(schedule_job_session) is True

    jobs = list(schedule_job_session.exec(select(MapExportJob)))
    assert len(jobs) == 1
    assert jobs[0].schedule_id == schedule.id
    assert jobs[0].status == "queued"

    refreshed = schedule_job_session.get(MapExportSchedule, schedule.id)
    assert refreshed is not None
    assert refreshed.runs_completed == 1
    assert refreshed.last_run_at is not None
    assert refreshed.next_run_at is not None
    assert refreshed.next_run_at != previous_next_run


def test_fire_next_due_schedule_clears_next_run_at_at_max_runs(
    schedule_job_session: Session,
) -> None:
    schedule = _add_due_schedule(schedule_job_session, max_runs=1)

    assert fire_due_map_export_schedules(schedule_job_session) == 1
    assert fire_due_map_export_schedules(schedule_job_session) == 0

    refreshed = schedule_job_session.get(MapExportSchedule, schedule.id)
    assert refreshed is not None
    assert refreshed.runs_completed == 1
    assert refreshed.next_run_at is None


def test_fire_next_due_schedule_halts_after_repeated_validation_failure(
    schedule_job_session: Session,
    caplog: pytest.LogCaptureFixture,
) -> None:
    schedule = _add_due_schedule(
        schedule_job_session,
        max_runs=3,
        payload="http://evil.com/export?date=2026-04-11",
    )

    with caplog.at_level(logging.ERROR, logger="prism_app.export_jobs.scheduler"):
        assert fire_next_due_map_export_schedule(schedule_job_session) is False

    refreshed = schedule_job_session.get(MapExportSchedule, schedule.id)
    assert refreshed is not None
    assert refreshed.runs_completed == 0
    assert refreshed.next_run_at is None
    assert schedule_job_session.exec(select(MapExportJob)).first() is None

    assert caplog.records
    assert all(
        record.levelname == "ERROR"
        and "Scheduled map export fire failed" in record.message
        for record in caplog.records
    )
    assert len(caplog.records) == SCHEDULE_FIRE_MAX_ATTEMPTS


def test_refresh_schedule_next_run_at_clears_when_cap_reached() -> None:
    schedule = MapExportSchedule(
        name="done",
        cron_expression="0 6 * * *",
        batch_map_url=moz_export_schedule_urls_text(),
        max_runs=1,
        runs_completed=1,
        next_run_at=utc_now(),
    )

    refresh_schedule_next_run_at(schedule)

    assert schedule.next_run_at is None
