"""scheduled_public_maps_cron DB schedule processing."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import patch
from uuid import UUID

from prism_app.database.map_export_job_model import MapExportJob
from prism_app.database.map_export_schedule_model import (
    MapExportSchedule,
    MapExportScheduleStatus,
)
from prism_app.export_jobs.priority import MAP_EXPORT_JOB_PRIORITY_SCHEDULED_PUBLIC
from prism_app.tests.fixtures.moz_export import MAP_EXPORT_FIXTURE_BASE_URL
from prism_app.workers.scheduled_public_maps.cron import (
    cadence_eligible_dates,
    main,
    process_active_schedules,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, select


def _utc_noon_ms(year: int, month: int, day: int) -> int:
    return int(datetime(year, month, day, 12, 0, 0, tzinfo=UTC).timestamp() * 1000)


def test_main_uses_db_schedules_by_default() -> None:
    with (
        patch(
            "prism_app.workers.scheduled_public_maps.cron.get_export_jobs_session_factory",
            return_value="session-factory",
        ),
        patch(
            "prism_app.workers.scheduled_public_maps.cron.process_active_schedules",
            return_value=(2, 3),
        ) as process_mock,
    ):
        code = main(["--dry-run"])

    assert code == 0
    process_mock.assert_called_once_with(
        "session-factory",
        dry_run=True,
        s3_client=None,
        timeout_sec=120.0,
    )


def test_cadence_eligible_dates_selects_representative_period_dates() -> None:
    dates = [
        datetime(2026, 1, 1, tzinfo=UTC).date(),
        datetime(2026, 1, 11, tzinfo=UTC).date(),
        datetime(2026, 1, 21, tzinfo=UTC).date(),
        datetime(2026, 2, 1, tzinfo=UTC).date(),
        datetime(2026, 4, 1, tzinfo=UTC).date(),
    ]

    assert cadence_eligible_dates(dates, "every_n_dekads", 2) == [
        datetime(2026, 1, 1, tzinfo=UTC).date(),
        datetime(2026, 1, 21, tzinfo=UTC).date(),
        datetime(2026, 4, 1, tzinfo=UTC).date(),
    ]
    assert cadence_eligible_dates(dates, "monthly", 1) == [
        datetime(2026, 1, 1, tzinfo=UTC).date(),
        datetime(2026, 2, 1, tzinfo=UTC).date(),
        datetime(2026, 4, 1, tzinfo=UTC).date(),
    ]
    assert cadence_eligible_dates(dates, "quarterly", 1) == [
        datetime(2026, 1, 1, tzinfo=UTC).date(),
        datetime(2026, 4, 1, tzinfo=UTC).date(),
    ]


def test_process_active_schedules_enqueues_latest_date_and_updates_state() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    MapExportSchedule.__table__.create(engine)
    MapExportJob.__table__.create(engine)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)
    owner_id = UUID("00000000-0000-4000-8000-000000000123")

    with SessionLocal() as session:
        schedule = MapExportSchedule(
            name="Mozambique rainfall",
            country="mozambique",
            layer_id="precip_blended_dekad",
            cadence="every_n_dekads",
            dekad_interval=1,
            export_url=f"{MAP_EXPORT_FIXTURE_BASE_URL}/export?date={{date}}&hazardLayerIds={{layer_id}}&bounds=24.99,-29.08,38.85,-10.74",
            format="pdf",
            export_options={"viewportWidth": 1200, "viewportHeight": 1697},
            created_by_user_id=owner_id,
        )
        session.add(schedule)
        session.commit()
        schedule_id = schedule.id

    days_map = {
        "rfb_blended_moz_dekad": [
            _utc_noon_ms(2026, 3, 21),
            _utc_noon_ms(2026, 4, 21),
        ],
    }
    process_active_schedules(SessionLocal, days_map=days_map, dry_run=False)

    with SessionLocal() as session:
        schedule = session.get(MapExportSchedule, schedule_id)
        assert schedule is not None
        assert schedule.last_checked_at is not None
        assert schedule.last_enqueued_at is not None
        assert str(schedule.last_enqueued_date) == "2026-04-21"

        jobs = list(session.exec(select(MapExportJob)))
        assert len(jobs) == 1
        job = jobs[0]
        assert job.priority == MAP_EXPORT_JOB_PRIORITY_SCHEDULED_PUBLIC
        assert job.map_export_schedule_id == schedule_id
        assert job.created_by_user_id == owner_id
        assert job.request_payload_json["publicMapUpload"] is True
        assert job.request_payload_json["country"] == "mozambique"
        assert job.request_payload_json["urls"] == [
            f"{MAP_EXPORT_FIXTURE_BASE_URL}/export?date=2026-04-21&hazardLayerIds=precip_blended_dekad&bounds=24.99,-29.08,38.85,-10.74"
        ]


def test_process_active_schedules_skips_stopped() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    MapExportSchedule.__table__.create(engine)
    MapExportJob.__table__.create(engine)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)

    with SessionLocal() as session:
        schedule = MapExportSchedule(
            name="Stopped schedule",
            status=MapExportScheduleStatus.stopped,
            country="mozambique",
            layer_id="precip_blended_dekad",
            cadence="monthly",
            dekad_interval=1,
            export_url=f"{MAP_EXPORT_FIXTURE_BASE_URL}/export?date={{date}}&hazardLayerIds={{layer_id}}",
            format="pdf",
            export_options={"viewportWidth": 1200, "viewportHeight": 1697},
        )
        session.add(schedule)
        session.commit()

    days_map = {"rfb_blended_moz_dekad": [_utc_noon_ms(2026, 4, 21)]}
    enqueued, _skipped = process_active_schedules(
        SessionLocal,
        days_map=days_map,
        dry_run=False,
    )

    assert enqueued == 0
    with SessionLocal() as session:
        assert list(session.exec(select(MapExportJob))) == []


def test_process_active_schedules_skips_date_already_enqueued() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    MapExportSchedule.__table__.create(engine)
    MapExportJob.__table__.create(engine)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)

    with SessionLocal() as session:
        schedule = MapExportSchedule(
            name="Mozambique rainfall",
            country="mozambique",
            layer_id="precip_blended_dekad",
            cadence="every_n_dekads",
            dekad_interval=1,
            export_url=f"{MAP_EXPORT_FIXTURE_BASE_URL}/export?date={{date}}&hazardLayerIds={{layer_id}}&bounds=24.99,-29.08,38.85,-10.74",
            format="pdf",
            export_options={"viewportWidth": 1200, "viewportHeight": 1697},
            last_enqueued_date=datetime(2026, 4, 21, tzinfo=UTC).date(),
        )
        session.add(schedule)
        session.commit()
        schedule_id = schedule.id

    days_map = {
        "rfb_blended_moz_dekad": [
            _utc_noon_ms(2026, 3, 21),
            _utc_noon_ms(2026, 4, 21),
        ],
    }
    enqueued, skipped = process_active_schedules(
        SessionLocal,
        days_map=days_map,
        dry_run=False,
    )

    assert enqueued == 0
    assert skipped == 1
    with SessionLocal() as session:
        schedule = session.get(MapExportSchedule, schedule_id)
        assert schedule is not None
        assert schedule.last_checked_at is not None
        assert str(schedule.last_enqueued_date) == "2026-04-21"
        assert list(session.exec(select(MapExportJob))) == []
