"""Admin CRUD and retry behavior for map export schedules."""

from __future__ import annotations

import json
import os
from typing import Any
from unittest.mock import MagicMock

import pytest
from prism_app.admin import MapExportScheduleView
from prism_app.auth.permission_codes import ALL_CAPABILITIES
from prism_app.database.map_export_schedule_model import MapExportSchedule
from prism_app.export_jobs.schedule_admin_form import MapExportScheduleAdminForm
from prism_app.export_jobs.schedule_service import reprepare_schedule_for_retry
from prism_app.tests.fixtures.moz_export import moz_export_map_request_dict
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, select
from starlette_admin._types import RequestAction
from starlette_admin.exceptions import ActionFailed, FormValidationError

os.environ.setdefault("KOBO_USERNAME", "pytest")
os.environ.setdefault("KOBO_PASSWORD", "pytest")


@pytest.fixture
def schedule_db_session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    MapExportSchedule.__table__.create(engine)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)
    with SessionLocal() as session:
        yield session
        session.rollback()


@pytest.fixture
def schedule_view() -> MapExportScheduleView:
    return MapExportScheduleView(MapExportSchedule)


def _admin_request(session: Session, action: RequestAction) -> MagicMock:
    request = MagicMock()
    request.state.session = session
    request.state.action = action
    request.state.permission_codes = ALL_CAPABILITIES
    return request


def _valid_schedule_form() -> dict[str, Any]:
    return {
        "name": "Moz nightly",
        "cron_expression": "0 6 * * *",
        "max_runs": 3,
        "request_payload_json": moz_export_map_request_dict(),
    }


def test_map_export_schedule_admin_form_parses_json_string() -> None:
    payload = moz_export_map_request_dict()
    form = MapExportScheduleAdminForm.model_validate(
        {
            "name": "Moz nightly",
            "cron_expression": "0 6 * * *",
            "max_runs": "5",
            "request_payload_json": json.dumps(payload),
        }
    )
    assert form.max_runs == 5
    assert form.request_payload_json.model_dump(mode="json") == payload


def test_map_export_schedule_admin_form_accepts_fixture_payload() -> None:
    form = MapExportScheduleAdminForm.model_validate(_valid_schedule_form())
    assert form.cron_expression == "0 6 * * *"
    assert form.max_runs == 3
    assert form.request_payload_json.format == "pdf"


def test_map_export_schedule_admin_form_rejects_bad_cron() -> None:
    form = _valid_schedule_form()
    form["cron_expression"] = "not-a-cron"
    with pytest.raises(ValidationError, match="Invalid cron expression"):
        MapExportScheduleAdminForm.model_validate(form)


@pytest.mark.asyncio
async def test_admin_validate_rejects_invalid_json_string(
    schedule_view: MapExportScheduleView,
    schedule_db_session: Session,
) -> None:
    request = _admin_request(schedule_db_session, RequestAction.CREATE)
    with pytest.raises(FormValidationError) as exc_info:
        await schedule_view.validate(
            request,
            {
                "name": "Bad JSON",
                "cron_expression": "0 6 * * *",
                "max_runs": "1",
                "request_payload_json": "{not-json",
            },
        )
    assert "request_payload_json" in exc_info.value.errors


@pytest.mark.asyncio
async def test_admin_create_persists_schedule_with_next_run(
    schedule_view: MapExportScheduleView,
    schedule_db_session: Session,
) -> None:
    request = _admin_request(schedule_db_session, RequestAction.CREATE)
    form = _valid_schedule_form()
    await schedule_view.create(request, form)

    rows = list(schedule_db_session.exec(select(MapExportSchedule)))
    assert len(rows) == 1
    schedule = rows[0]
    assert schedule.name == "Moz nightly"
    assert schedule.runs_completed == 0
    assert schedule.max_runs == 3
    assert schedule.next_run_at is not None
    assert schedule.request_payload_json["format"] == "pdf"


@pytest.mark.asyncio
async def test_admin_edit_updates_cron_and_recomputes_next_run(
    schedule_view: MapExportScheduleView,
    schedule_db_session: Session,
) -> None:
    create_request = _admin_request(schedule_db_session, RequestAction.CREATE)
    created = await schedule_view.create(create_request, _valid_schedule_form())
    previous_next_run = created.next_run_at

    edit_request = _admin_request(schedule_db_session, RequestAction.EDIT)
    await schedule_view.edit(
        edit_request,
        created.id,
        {
            "name": "Moz morning",
            "cron_expression": "0 7 * * *",
            "max_runs": 3,
            "request_payload_json": created.request_payload_json,
        },
    )

    updated = schedule_db_session.get(MapExportSchedule, created.id)
    assert updated is not None
    assert updated.name == "Moz morning"
    assert updated.cron_expression == "0 7 * * *"
    assert updated.next_run_at is not None
    assert updated.next_run_at != previous_next_run


@pytest.mark.asyncio
async def test_admin_delete_removes_schedule(
    schedule_view: MapExportScheduleView,
    schedule_db_session: Session,
) -> None:
    create_request = _admin_request(schedule_db_session, RequestAction.CREATE)
    created = await schedule_view.create(create_request, _valid_schedule_form())

    delete_request = _admin_request(schedule_db_session, RequestAction.LIST)
    deleted = await schedule_view.delete(delete_request, [created.id])
    assert deleted == 1
    assert schedule_db_session.get(MapExportSchedule, created.id) is None


@pytest.mark.asyncio
async def test_admin_retry_schedule_restores_next_run(
    schedule_view: MapExportScheduleView,
    schedule_db_session: Session,
) -> None:
    create_request = _admin_request(schedule_db_session, RequestAction.CREATE)
    created = await schedule_view.create(create_request, _valid_schedule_form())
    created.next_run_at = None
    schedule_db_session.add(created)
    schedule_db_session.commit()

    retry_request = _admin_request(schedule_db_session, RequestAction.DETAIL)
    message = await schedule_view.retry_schedule_row_action(retry_request, created.id)
    assert "next_run_at=" in message

    refreshed = schedule_db_session.get(MapExportSchedule, created.id)
    assert refreshed is not None
    assert refreshed.next_run_at is not None


@pytest.mark.asyncio
async def test_admin_retry_schedule_rejects_active_schedule(
    schedule_view: MapExportScheduleView,
    schedule_db_session: Session,
) -> None:
    create_request = _admin_request(schedule_db_session, RequestAction.CREATE)
    created = await schedule_view.create(create_request, _valid_schedule_form())

    retry_request = _admin_request(schedule_db_session, RequestAction.DETAIL)
    with pytest.raises(ActionFailed, match="already has a next run time"):
        await schedule_view.retry_schedule_row_action(retry_request, created.id)


def test_reprepare_schedule_for_retry_requires_remaining_runs() -> None:
    schedule = MapExportSchedule(
        name="done",
        cron_expression="0 6 * * *",
        request_payload_json=moz_export_map_request_dict(),
        max_runs=1,
        runs_completed=1,
    )
    with pytest.raises(ValueError, match="completed all configured runs"):
        reprepare_schedule_for_retry(schedule)
