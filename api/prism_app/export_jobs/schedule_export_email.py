"""Email notification when a scheduled map export job succeeds."""

from __future__ import annotations

import logging
import smtplib
from uuid import UUID

from prism_app.alert_workers import mail_render, settings, smtp_mailer
from prism_app.database.map_export_job_model import MapExportJob
from prism_app.database.map_export_schedule_model import MapExportSchedule
from prism_app.database.user_model import User
from prism_app.export_jobs.download_filename import (
    extract_dates_from_urls_sorted,
    map_export_download_filename_from_payload,
)
from prism_app.export_s3 import (
    MAP_EXPORT_EMAIL_PRESIGN_EXPIRES_IN,
    get_s3_client_for_presign,
    is_file_artifact_uri,
    map_export_artifact_exists,
    presign_export_get,
    s3_client_for_artifact,
)
from prism_app.map_export_layer_catalog import schedule_layer_label
from prism_app.models import MapExportRequestModel
from sqlmodel import Session

logger = logging.getLogger(__name__)

_SCHEDULE_EXPORT_ADMIN_IDENTITY = "map-export-schedule"
_MAP_EXPORT_EMAIL_FROM = "wfp.prism@wfp.org"
_MAP_EXPORT_EMAIL_SUBJECT = "PRISM scheduled map export ready"
_LINK_EXPIRY_DAYS = MAP_EXPORT_EMAIL_PRESIGN_EXPIRES_IN // (24 * 3600)


def map_export_schedules_admin_url() -> str:
    return f"{settings.api_base_url()}/admin/{_SCHEDULE_EXPORT_ADMIN_IDENTITY}/list"


def _recipient_user_id(
    job: MapExportJob, schedule: MapExportSchedule | None
) -> UUID | None:
    if job.created_by_user_id is not None:
        return job.created_by_user_id
    if schedule is not None and schedule.created_by_user_id is not None:
        return schedule.created_by_user_id
    return None


def send_schedule_export_email(
    session: Session,
    job: MapExportJob,
    *,
    schedule: MapExportSchedule | None = None,
    recipient_email: str | None = None,
    force_send: bool = False,
) -> None:
    """Notify the schedule owner that a new map export is ready.

    ``force_send`` and ``recipient_email`` are for Ethereal dev testing only
    (see ``python -m prism_app.workers.schedule_export_email_runner``).
    """
    if not force_send and not settings.is_production():
        logger.info(
            "Skipping schedule export email for job %s (non-production)",
            job.id,
        )
        return

    if job.map_export_schedule_id is None:
        return

    if job.status != "succeeded" or not job.s3_uri:
        return

    if is_file_artifact_uri(job.s3_uri):
        logger.info(
            "Skipping schedule export email for job %s (local file artifact)",
            job.id,
        )
        return

    verify_client = s3_client_for_artifact(job.s3_uri, None)
    if not map_export_artifact_exists(job.s3_uri, s3_client=verify_client):
        logger.warning(
            "Skipping schedule export email for job %s (artifact missing)",
            job.id,
        )
        return

    schedule = schedule or session.get(MapExportSchedule, job.map_export_schedule_id)
    if schedule is None:
        logger.warning(
            "Skipping schedule export email for job %s (schedule %s not found)",
            job.id,
            job.map_export_schedule_id,
        )
        return

    to_email = (recipient_email or "").strip()
    if not to_email:
        user_id = _recipient_user_id(job, schedule)
        if user_id is None:
            logger.warning(
                "Skipping schedule export email for job %s (no created_by_user_id)",
                job.id,
            )
            return

        user = session.get(User, user_id)
        if user is None or not (user.email or "").strip():
            logger.warning(
                "Skipping schedule export email for job %s (user %s has no email)",
                job.id,
                user_id,
            )
            return
        to_email = user.email.strip()

    try:
        req = MapExportRequestModel.model_validate(job.request_payload_json)
    except Exception:
        logger.exception(
            "Skipping schedule export email for job %s (invalid request payload)",
            job.id,
        )
        return

    download_filename = map_export_download_filename_from_payload(
        job.request_payload_json
    )
    presign_client = get_s3_client_for_presign()
    download_url = presign_export_get(
        job.s3_uri,
        presign_client,
        expires_in=MAP_EXPORT_EMAIL_PRESIGN_EXPIRES_IN,
        download_filename=download_filename,
    )

    dates = extract_dates_from_urls_sorted(req.urls)
    map_date = dates[0] if dates else None
    layer_title = schedule_layer_label(schedule.country, schedule.layer_id)
    format_label = "PDF" if req.format == "pdf" else "PNG"
    prism_url = req.urls[0].strip() if req.urls else None

    html_body, text_body = mail_render.render_schedule_export_mail(
        heading_title="Scheduled map export ready",
        schedule_name=schedule.name,
        layer_title=layer_title,
        layer_id=schedule.layer_id,
        country=schedule.country,
        map_date=map_date,
        format_label=format_label,
        download_url=download_url,
        admin_schedules_url=map_export_schedules_admin_url(),
        link_expiry_days=_LINK_EXPIRY_DAYS,
        prism_url=prism_url,
    )

    try:
        smtp_mailer.require_smtp_configured()
    except RuntimeError as exc:
        logger.error(
            "Schedule export email for job %s not sent: %s",
            job.id,
            exc,
        )
        return

    try:
        smtp_mailer.send_email(
            from_addr=_MAP_EXPORT_EMAIL_FROM,
            to_addrs=to_email,
            subject=_MAP_EXPORT_EMAIL_SUBJECT,
            text_body=text_body,
            html_body=html_body,
        )
        logger.info(
            "Sent schedule export email for job %s to %s",
            job.id,
            to_email,
        )
    except (smtplib.SMTPException, OSError, TimeoutError):
        logger.exception(
            "Failed to send schedule export email for job %s to %s",
            job.id,
            to_email,
        )
