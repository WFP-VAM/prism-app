"""Anticipatory Action flood worker (``aa-flood-alert``)."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import httpx
from prism_app.alert_workers import db, settings, smtp_mailer
from prism_app.alert_workers.browser_shot import Crop, capture_screenshot_from_url
from prism_app.alert_workers.mail_render import render_flood_mail

logger = logging.getLogger(__name__)

TRIGGER_STATUSES = ("not exceeded", "bankfull", "moderate", "severe")
DATES_URL = (
    "https://data.earthobservation.vam.wfp.org/public-share/aa/flood/moz/dates.json"
)
SEVERITY_ORDER = ("severe", "moderate", "bankfull", "not exceeded")


def flood_prism_url(basic_prism_url: str, date_yyyy_mm_dd: str) -> str:
    p = urlparse(basic_prism_url)
    q = dict(parse_qsl(p.query, keep_blank_values=True))
    q["hazardLayerIds"] = "anticipatory_action_flood"
    q["date"] = date_yyyy_mm_dd
    return urlunparse((p.scheme, p.netloc, p.path, p.params, urlencode(q), p.fragment))


def _format_date(iso: str, fmt: str) -> str:
    d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ]
    if fmt == "YYYY-MM-DD":
        return d.strftime("%Y-%m-%d")
    if fmt == "DD-Month-YYYY":
        return f"{d.day}-{months[d.month - 1]}-{d.year}"
    raise ValueError(fmt)


def fetch_flood_dates_json(client: httpx.Client) -> dict[str, Any]:
    try:
        r = client.get(DATES_URL, timeout=120.0)
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        logger.error("flood dates.json: %s", exc)
        return {}


def latest_flood_date(dates: dict[str, Any]) -> str | None:
    if not dates:
        return None
    return max(dates, key=lambda k: datetime.fromisoformat(k.replace("Z", "+00:00")))


def transform_station_name(name: str) -> str:
    return " ".join(w.capitalize() for w in name.split("_"))


def fetch_station_summary(client: httpx.Client, url: str) -> list[dict[str, Any]]:
    try:
        r = client.get(url, timeout=120.0)
        r.raise_for_status()
        lines = r.text.strip().split("\n")
        if not lines:
            return []
        headers = [h.strip() for h in lines[0].split(",")]
        out: list[dict[str, Any]] = []
        for line in lines[1:]:
            vals = [v.strip() for v in line.split(",")]
            row = {
                headers[i]: vals[i] if i < len(vals) else ""
                for i in range(len(headers))
            }
            if row.get("station_name"):
                out.append(
                    {
                        "station_name": transform_station_name(row["station_name"]),
                        "station_id": row.get("station_id", ""),
                        "river_name": row.get("river_name"),
                        "trigger_status": row.get("trigger_status"),
                    },
                )
        return out
    except Exception as exc:
        logger.error("station summary: %s", exc)
        return []


def should_send_flood_email(trigger: str | None) -> bool:
    if not trigger:
        return False
    t = str(trigger).lower()
    return t in TRIGGER_STATUSES and t != "not exceeded"


def transform_last_flood(date: str, trigger: str) -> dict[str, dict[str, str]]:
    return {"moz_flood": {"status": trigger, "refTime": date}}


def build_flood_payload(
    client: httpx.Client,
    *,
    date_iso: str,
    trigger_status: str,
    prism_url: str,
    emails: list[str],
    station_summary_url: str | None,
    is_test: bool = False,
) -> dict[str, Any] | None:
    if not is_test and not should_send_flood_email(trigger_status):
        return None
    if is_test and not should_send_flood_email(trigger_status):
        logger.info(
            "Test email: sending despite trigger_status=%r (no live alert)",
            trigger_status,
        )
    redirect = flood_prism_url(prism_url, _format_date(date_iso, "YYYY-MM-DD"))
    b64 = capture_screenshot_from_url(
        redirect,
        elements_to_hide=[".MuiDrawer-root", ".MuiList-root", ".MuiGrid-root"],
        crop=Crop(900, 50, 1000, 950),
    )
    title_date = _format_date(date_iso, "DD-Month-YYYY")
    title = f"Flood Anticipatory Actions Trigger detected in Mozambique ({title_date})"

    by_status: dict[str, list[str]] = {}
    if station_summary_url:
        for s in fetch_station_summary(client, station_summary_url):
            st = s.get("trigger_status")
            if st and str(st).lower() != "not exceeded":
                by_status.setdefault(str(st).lower(), []).append(s["station_name"])
        sorted_status: dict[str, list[str]] = {}
        for status in SEVERITY_ORDER:
            if status in by_status:
                sorted_status[status] = by_status[status]
        by_status = sorted_status

    html, text = render_flood_mail(
        title=title,
        trigger_status=trigger_status,
        stations_by_status=by_status,
        redirect_url=redirect,
    )
    asset_dir = __import__("pathlib").Path(__file__).resolve().parent / "assets"
    import base64

    return {
        "html": html,
        "text": text,
        "subject": title,
        "bcc": emails,
        "attachments": [
            {
                "filename": "map-icon.png",
                "path": asset_dir / "mapIcon.png",
                "cid": "map-icon",
            },
            {
                "filename": "arrow-forward-icon.png",
                "path": asset_dir / "arrowForwardIcon.png",
                "cid": "arrow-forward-icon",
            },
            {
                "filename": "flood-map.jpg",
                "content": base64.b64decode(b64),
                "cid": "flood-image-cid",
                "subtype": "jpeg",
            },
        ],
    }


def run_flood_worker(override_emails: list[str] | None = None) -> None:
    country = settings.aa_alert_country()
    is_test = bool(override_emails)
    with httpx.Client(verify=settings.http_verify_ssl(), timeout=120.0) as client:
        dates = fetch_flood_dates_json(client)
        latest = latest_flood_date(dates)
        if not latest:
            logger.error("No flood dates")
            return
        entry = dates[latest]
        trigger_status = str(entry.get("trigger_status") or "not exceeded")
        station_file = entry.get("station_summary_file")
        summary_url = (
            f"https://data.earthobservation.vam.wfp.org/public-share/aa/flood/moz/{station_file}"
            if station_file
            else None
        )

        now = datetime.now(timezone.utc)
        with db.alerts_session() as conn:
            rows = db.fetch_aa_alerts(conn, country, "flood")
            if override_emails:
                rows = [
                    {
                        "id": 1,
                        "emails": override_emails,
                        "prism_url": "https://prism.moz.wfp.org/",
                        "last_states": None,
                    },
                ]
            if not rows:
                logger.error("No flood AA config for %s", country)
                return

            for alert in rows:
                last_states = alert.get("last_states") or {}
                moz = (
                    last_states.get("moz_flood")
                    if isinstance(last_states, dict)
                    else None
                )
                last_ref = moz.get("refTime") if isinstance(moz, dict) else None
                is_new = not last_ref or datetime.fromisoformat(
                    latest.replace("Z", "+00:00"),
                ) > datetime.fromisoformat(str(last_ref).replace("Z", "+00:00"))

                if not is_new and not override_emails:
                    db.update_aa_alert(
                        conn,
                        alert_id=alert["id"],
                        last_states=(
                            last_states if isinstance(last_states, dict) else {}
                        ),
                        last_ran_at=now,
                        last_triggered_at=None,
                    )
                    continue

                payload = build_flood_payload(
                    client,
                    date_iso=latest,
                    trigger_status=trigger_status,
                    prism_url=str(alert["prism_url"]),
                    emails=list(alert["emails"]),
                    station_summary_url=summary_url,
                    is_test=is_test,
                )
                if payload:
                    smtp_mailer.send_email(
                        from_addr="wfp.prism@wfp.org",
                        to_addrs="",
                        bcc=payload["bcc"],
                        subject=payload["subject"],
                        text_body=payload["text"],
                        html_body=payload["html"],
                        attachments=payload["attachments"],
                    )
                elif is_test:
                    logger.error("Could not build flood test email payload")
                else:
                    logger.info(
                        "No flood alert to send (trigger_status=%r)",
                        trigger_status,
                    )

                if not override_emails:
                    db.update_aa_alert(
                        conn,
                        alert_id=alert["id"],
                        last_states=transform_last_flood(latest, trigger_status),
                        last_ran_at=now,
                        last_triggered_at=now if payload else None,
                    )
