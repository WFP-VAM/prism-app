"""Tests for scheduled map export notification emails."""

from __future__ import annotations

import smtplib
import uuid
from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from prism_app.alert_workers.mail_render import render_schedule_export_mail
from prism_app.database.map_export_job_model import MapExportJob
from prism_app.database.map_export_schedule_model import (
    MapExportSchedule,
    MapExportScheduleCadence,
    MapExportScheduleFormat,
    MapExportScheduleStatus,
)
from prism_app.database.user_model import User, UserStatus
from prism_app.export_jobs.schedule_export_email import (
    map_export_schedules_admin_url,
    send_schedule_export_email,
)
from prism_app.tests.fixtures.moz_export import MAP_EXPORT_FIXTURE_BASE_URL


def test_render_schedule_export_mail_plain_format() -> None:
    html, text = render_schedule_export_mail(
        heading_title="Scheduled map export ready",
        schedule_name="Moz monthly precip",
        layer_title="precip_blended_dekad — Blended precipitation",
        layer_id="precip_blended_dekad",
        country="mozambique",
        map_date="2026-05-21",
        format_label="PDF",
        download_url="https://example.com/presigned.pdf",
        admin_schedules_url="https://api.example.org/admin/map-export-schedule/list",
        link_expiry_days=7,
        prism_url="https://prism.example/map?date=2026-05-21",
    )
    assert "Your scheduled map export Moz monthly precip is ready." in html
    assert "Layer: precip_blended_dekad" in html
    assert "Date: 2026-05-21" in html
    assert "Download your PDF map" in html
    assert "https://example.com/presigned.pdf" in html
    assert "valid for 7 days" in html
    assert "admin/map-export-schedule/list" in html
    assert "https://prism.example/map?date=2026-05-21" in html
    assert (
        'Go to precip_blended_dekad — Blended precipitation <a href="https://prism.example/map?date=2026-05-21">'
        in html
    )
    assert "World Food Programme" in html
    assert "rgba(99, 178, 189, 1)" not in html
    assert "cid:arrow-forward-icon" not in html
    assert "Your scheduled map export Moz monthly precip is ready." in text
    assert "Layer: precip_blended_dekad" in text
    assert "valid for 7 days" in text


def test_map_export_schedules_admin_url() -> None:
    with patch(
        "prism_app.export_jobs.schedule_export_email.settings.api_base_url",
        return_value="https://api.example.org",
    ):
        assert (
            map_export_schedules_admin_url()
            == "https://api.example.org/admin/map-export-schedule/list"
        )


def _schedule_export_fixtures() -> tuple[MapExportJob, MapExportSchedule, User]:
    user = User(
        id=UUID("00000000-0000-4000-8000-0000000000aa"),
        ciam_sub="sub-schedule-mail",
        email="scheduler@example.org",
        name="Scheduler",
        status=UserStatus.active,
    )
    schedule_id = UUID("00000000-0000-4000-8000-0000000000bb")
    schedule = MapExportSchedule(
        id=schedule_id,
        name="Test schedule",
        status=MapExportScheduleStatus.active,
        country="mozambique",
        layer_id="precip_blended_dekad",
        cadence=MapExportScheduleCadence.monthly,
        export_url=f"{MAP_EXPORT_FIXTURE_BASE_URL}/export?date={{date}}&layer_id={{layer_id}}",
        format=MapExportScheduleFormat.pdf,
        export_options={},
        created_by_user_id=user.id,
    )
    job = MapExportJob(
        id=str(uuid.uuid4()),
        request_fingerprint="fp-schedule-mail",
        request_payload_json={
            "urls": [
                f"{MAP_EXPORT_FIXTURE_BASE_URL}/export?date=2026-05-21&hazardLayerIds=precip_blended_dekad",
            ],
            "format": "pdf",
            "country": "mozambique",
            "publicMapUpload": True,
        },
        status="succeeded",
        s3_uri="s3://bucket/public_maps/moz/layer/job.pdf",
        content_type="pdf",
        map_export_schedule_id=schedule_id,
        created_by_user_id=user.id,
    )
    return job, schedule, user


def _mock_session(
    job: MapExportJob, schedule: MapExportSchedule, user: User
) -> MagicMock:
    session = MagicMock()

    def _get(model: type, pk: object) -> object | None:
        if model is MapExportSchedule and pk == schedule.id:
            return schedule
        if model is User and pk == user.id:
            return user
        return None

    session.get.side_effect = _get
    return session


@pytest.mark.parametrize("prism_env", [None, "development", "staging"])
def test_send_schedule_export_email_skips_non_production(
    monkeypatch: pytest.MonkeyPatch,
    prism_env: str | None,
) -> None:
    if prism_env is None:
        monkeypatch.delenv("PRISM_ENV", raising=False)
    else:
        monkeypatch.setenv("PRISM_ENV", prism_env)

    job, schedule, user = _schedule_export_fixtures()
    session = _mock_session(job, schedule, user)
    with patch(
        "prism_app.export_jobs.schedule_export_email.smtp_mailer.send_email"
    ) as send:
        send_schedule_export_email(session, job)
        send.assert_not_called()


def test_send_schedule_export_email_skips_interactive_job(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PRISM_ENV", "production")
    job, schedule, user = _schedule_export_fixtures()
    job.map_export_schedule_id = None
    session = _mock_session(job, schedule, user)

    with patch(
        "prism_app.export_jobs.schedule_export_email.smtp_mailer.send_email"
    ) as send:
        send_schedule_export_email(session, job)
        send.assert_not_called()


def test_send_schedule_export_email_sends_in_production(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PRISM_ENV", "production")
    monkeypatch.setenv("PRISM_ALERTS_EMAIL_USER", "smtp-user")
    monkeypatch.setenv("PRISM_ALERTS_EMAIL_PASSWORD", "smtp-pass")
    job, schedule, user = _schedule_export_fixtures()
    session = _mock_session(job, schedule, user)

    with (
        patch(
            "prism_app.export_jobs.schedule_export_email.map_export_artifact_exists",
            return_value=True,
        ),
        patch(
            "prism_app.export_jobs.schedule_export_email.presign_export_get",
            return_value="https://example.com/presigned.pdf",
        ) as presign,
        patch(
            "prism_app.export_jobs.schedule_export_email.smtp_mailer.send_email",
        ) as send,
    ):
        send_schedule_export_email(session, job)

    presign.assert_called_once()
    _args, kwargs = presign.call_args
    assert kwargs["expires_in"] == 7 * 24 * 3600
    send.assert_called_once()
    assert send.call_args.kwargs["to_addrs"] == user.email
    assert send.call_args.kwargs["subject"] == "PRISM scheduled map export ready"
    assert "https://example.com/presigned.pdf" in send.call_args.kwargs["html_body"]


def test_send_schedule_export_email_skips_local_file_artifact(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PRISM_ENV", "production")
    job, schedule, user = _schedule_export_fixtures()
    job.s3_uri = "file:///cache/map_exports/job.pdf"
    session = _mock_session(job, schedule, user)

    with patch(
        "prism_app.export_jobs.schedule_export_email.smtp_mailer.send_email"
    ) as send:
        send_schedule_export_email(session, job)
        send.assert_not_called()


def test_send_schedule_export_email_force_send_in_non_production(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("PRISM_ENV", raising=False)
    job, schedule, user = _schedule_export_fixtures()
    session = _mock_session(job, schedule, user)

    with (
        patch(
            "prism_app.export_jobs.schedule_export_email.map_export_artifact_exists",
            return_value=True,
        ),
        patch(
            "prism_app.export_jobs.schedule_export_email.presign_export_get",
            return_value="https://example.com/presigned.pdf",
        ),
        patch(
            "prism_app.export_jobs.schedule_export_email.smtp_mailer.send_email",
        ) as send,
    ):
        send_schedule_export_email(
            session,
            job,
            schedule=schedule,
            recipient_email="ethereal-test@example.com",
            force_send=True,
        )

    send.assert_called_once()
    assert send.call_args.kwargs["to_addrs"] == "ethereal-test@example.com"


def test_send_schedule_export_email_logs_smtp_delivery_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PRISM_ENV", "production")
    monkeypatch.setenv("PRISM_ALERTS_EMAIL_USER", "smtp-user")
    monkeypatch.setenv("PRISM_ALERTS_EMAIL_PASSWORD", "smtp-pass")
    job, schedule, user = _schedule_export_fixtures()
    session = _mock_session(job, schedule, user)

    with (
        patch(
            "prism_app.export_jobs.schedule_export_email.map_export_artifact_exists",
            return_value=True,
        ),
        patch(
            "prism_app.export_jobs.schedule_export_email.presign_export_get",
            return_value="https://example.com/presigned.pdf",
        ),
        patch(
            "prism_app.export_jobs.schedule_export_email.smtp_mailer.send_email",
            side_effect=smtplib.SMTPAuthenticationError(535, b"Auth failed"),
        ),
    ):
        send_schedule_export_email(session, job)


def test_send_schedule_export_email_skips_when_smtp_not_configured_in_production(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PRISM_ENV", "production")
    monkeypatch.delenv("PRISM_ALERTS_EMAIL_USER", raising=False)
    monkeypatch.delenv("PRISM_ALERTS_EMAIL_PASSWORD", raising=False)
    job, schedule, user = _schedule_export_fixtures()
    session = _mock_session(job, schedule, user)

    with (
        patch(
            "prism_app.export_jobs.schedule_export_email.map_export_artifact_exists",
            return_value=True,
        ),
        patch(
            "prism_app.export_jobs.schedule_export_email.presign_export_get",
            return_value="https://example.com/presigned.pdf",
        ),
        patch(
            "prism_app.export_jobs.schedule_export_email.smtp_mailer.send_email",
        ) as send,
    ):
        send_schedule_export_email(session, job)

    send.assert_not_called()
