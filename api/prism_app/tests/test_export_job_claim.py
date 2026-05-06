"""Claim next queued map export job (SQLite in tests; SKIP LOCKED only on Postgres)."""

from __future__ import annotations

import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import Session

from prism_app.database.map_export_job_model import MapExportJob
from prism_app.export_job_claim import claim_next_queued_map_export_job


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


def test_claim_returns_none_when_empty(db_session: Session) -> None:
    assert claim_next_queued_map_export_job(db_session) is None


def test_claim_picks_oldest_queued(db_session: Session) -> None:
    t0 = datetime.datetime(2025, 1, 1, tzinfo=datetime.UTC)
    t1 = datetime.datetime(2025, 1, 2, tzinfo=datetime.UTC)
    older = MapExportJob(
        request_fingerprint="a",
        request_payload_json={"urls": ["http://localhost/?date=2025-01-01"], "format": "pdf"},
        status="queued",
        requested_by="u",
        created_at=t0,
        updated_at=t0,
    )
    newer = MapExportJob(
        request_fingerprint="b",
        request_payload_json={"urls": ["http://localhost/?date=2025-01-02"], "format": "pdf"},
        status="queued",
        requested_by="u",
        created_at=t1,
        updated_at=t1,
    )
    db_session.add(newer)
    db_session.add(older)
    db_session.commit()

    first_id = claim_next_queued_map_export_job(db_session)
    assert first_id == older.id

    row = db_session.get(MapExportJob, first_id)
    assert row is not None
    assert row.status == "running"
    assert row.started_at is not None

    second_id = claim_next_queued_map_export_job(db_session)
    assert second_id == newer.id


def test_claim_skips_non_queued(db_session: Session) -> None:
    j = MapExportJob(
        request_fingerprint="a",
        request_payload_json={"urls": ["http://localhost/?date=2025-01-01"], "format": "pdf"},
        status="running",
        requested_by="u",
    )
    db_session.add(j)
    db_session.commit()

    assert claim_next_queued_map_export_job(db_session) is None
