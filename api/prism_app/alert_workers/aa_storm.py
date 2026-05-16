"""Anticipatory Action storm worker (``aa-storm-alert``)."""

from __future__ import annotations

import base64
import logging
from datetime import datetime, timezone
from enum import StrEnum
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import httpx

from prism_app.alert_workers import db, settings
from prism_app.alert_workers import smtp_mailer
from prism_app.alert_workers.browser_shot import Crop, capture_screenshot_from_url
from prism_app.alert_workers.coastal_districts import ALL_DISTRICTS_IN_COASTAL_PROVINCE
from prism_app.alert_workers.mail_render import render_storm_mail

logger = logging.getLogger(__name__)

STORM_DATES_JSON = (
    "https://data.earthobservation.vam.wfp.org/public-share/aa/ts/outputs/dates.json"
)
COASTAL = set(ALL_DISTRICTS_IN_COASTAL_PROVINCE)


class WindState(StrEnum):
    monitoring = "monitoring"
    ready = "ready"
    activated_48kt = "activated_48kt"
    activated_64kt = "activated_64kt"


DISPLAY_WIND = {
    WindState.activated_64kt: "> 119 km/h",
    WindState.activated_48kt: "> 89 km/h",
}


def _storm_ready_states() -> set[str]:
    return {
        WindState.ready,
        WindState.activated_48kt,
        WindState.activated_64kt,
    }


def fetch_all_reports(client: httpx.Client) -> dict[str, Any] | None:
    try:
        r = client.get(STORM_DATES_JSON, timeout=120.0)
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        logger.error("storm dates.json: %s", exc)
        return None


def get_latest_available_reports(client: httpx.Client) -> list[dict[str, Any]]:
    raw = fetch_all_reports(client)
    if not raw:
        return []
    ready = _storm_ready_states()
    filtered_by_day: dict[str, dict[str, list[dict[str, Any]]]] = {}
    for day, day_reports in raw.items():
        if not isinstance(day_reports, dict):
            continue
        storm_acc: dict[str, list[dict[str, Any]]] = {}
        for storm_name, storm_reports in day_reports.items():
            if not isinstance(storm_reports, list):
                continue
            kept = [
                rep
                for rep in storm_reports
                if isinstance(rep, dict) and rep.get("state") in ready
            ]
            if kept:
                storm_acc[storm_name] = kept
        if storm_acc:
            filtered_by_day[day] = storm_acc
    if not filtered_by_day:
        return []
    latest_day = max(
        filtered_by_day,
        key=lambda d: datetime.fromisoformat(d.replace("Z", "+00:00")),
    )
    latest_day_reports = filtered_by_day[latest_day]
    out: list[dict[str, Any]] = []
    for _storm_name, reports in latest_day_reports.items():
        latest = max(
            reports,
            key=lambda r: datetime.fromisoformat(
                str(r["ref_time"]).replace("Z", "+00:00")
            ),
        )
        out.append(latest)
    return out


def filter_out_already_processed(
    reports: list[dict[str, Any]],
    last_states: dict[str, dict[str, str]] | None,
) -> list[dict[str, Any]]:
    if not last_states:
        return reports
    filtered: list[dict[str, Any]] = []
    for rep in reports:
        path = str(rep.get("path", ""))
        storm_name = path.split("/")[0] if path else ""
        ref = datetime.fromisoformat(str(rep["ref_time"]).replace("Z", "+00:00"))
        prev = last_states.get(storm_name)
        if (
            not prev
            or datetime.fromisoformat(str(prev["refTime"]).replace("Z", "+00:00")) < ref
        ):
            filtered.append(rep)
    return filtered


def transform_reports_to_last_processed(
    reports: list[dict[str, Any]],
) -> dict[str, dict[str, str]]:
    out: dict[str, dict[str, str]] = {}
    for rep in reports:
        path = str(rep.get("path", ""))
        storm_name = path.split("/")[0] if path else ""
        out[storm_name] = {
            "refTime": str(rep["ref_time"]),
            "status": str(rep.get("state", "")),
        }
    return out


def _exposed_districts(report: dict[str, Any]) -> tuple[list[str], list[str]]:
    rsr = report.get("ready_set_results") or {}
    ex64 = rsr.get("exposed_area_64kt") or {}
    ex48 = rsr.get("exposed_area_48kt") or {}
    d64 = [d for d in ex64.get("affected_districts", []) if d in COASTAL]
    watched_48 = ["monitoring disabled for 48kt"]
    d48 = [d for d in ex48.get("affected_districts", []) if d in watched_48]
    return d48, d64


def has_landfall_occurred(report: dict[str, Any], *, is_test: bool) -> bool:
    if is_test:
        return False
    li = report.get("landfall_info") or {}
    if isinstance(li, dict) and "landfall_time" in li:
        times = li.get("landfall_time")
        if isinstance(times, list) and len(times) > 1:
            return datetime.now(timezone.utc) > datetime.fromisoformat(
                str(times[1]).replace("Z", "+00:00"),
            )
    return False


def should_send_storm_email(
    status: str | None,
    exposed48: list[str],
    exposed64: list[str],
    past_landfall: bool,
) -> bool:
    has_exposed = bool(exposed48) or bool(exposed64)
    return (
        not past_landfall
        and has_exposed
        and str(status) != WindState.monitoring
        and status is not None
    )


def _format_storm_time(reference_time: str) -> str:
    d = datetime.fromisoformat(reference_time.replace("Z", "+00:00"))
    return f"{d.day:02d}/{d.month:02d}/{d.year} {d.hour:02d}:{d.minute:02d} UTC"


def build_prism_storm_url(basic_url: str, report_date: str) -> str:
    d = datetime.fromisoformat(report_date.replace("Z", "+00:00"))
    day = d.strftime("%Y-%m-%d")
    p = urlparse(basic_url)
    q = dict(parse_qsl(p.query, keep_blank_values=True))
    q["hazardLayerIds"] = "anticipatory_action_storm"
    q["date"] = day
    return urlunparse((p.scheme, p.netloc, p.path, p.params, urlencode(q), p.fragment))


def build_email_payloads(
    client: httpx.Client,
    short_reports: list[dict[str, Any]],
    basic_prism_url: str,
    emails: list[str],
    country: str,
    *,
    is_test: bool,
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    country_disp = "Mozambique" if country.lower() == "mozambique" else country.title()
    for short_report in short_reports:
        path = short_report.get("path")
        if not path:
            continue
        url = (
            "https://data.earthobservation.vam.wfp.org/public-share/"
            f"aa/ts/outputs/{path}?v2"
        )
        r = client.get(url, timeout=120.0)
        r.raise_for_status()
        detailed: dict[str, Any] = r.json()
        exposed48, exposed64 = _exposed_districts(detailed)
        rsr = detailed.get("ready_set_results") or {}
        status = rsr.get("status")
        past = has_landfall_occurred(detailed, is_test=is_test)
        if not should_send_storm_email(status, exposed48, exposed64, past):
            continue
        fd = detailed.get("forecast_details") or {}
        ref_time = str(fd.get("reference_time", ""))
        prism_url = build_prism_storm_url(basic_prism_url, ref_time)
        b64 = capture_screenshot_from_url(
            prism_url,
            elements_to_hide=[".MuiDrawer-root", ".MuiList-root", ".MuiGrid-root"],
            crop=Crop(900, 50, 1000, 950),
        )
        cyclone_name = str(fd.get("cyclone_name", ""))
        cyclone_time = _format_storm_time(ref_time)
        try:
            ws = WindState(str(status)) if status else None
        except ValueError:
            ws = None
        windspeed = DISPLAY_WIND.get(ws) if ws else None
        readiness = str(status) == WindState.ready.value
        if windspeed:
            alert_title = (
                f"Activation Triggers detected for windspeed {windspeed} "
                f"for {cyclone_name} in {country_disp}"
            )
        elif str(status) == WindState.ready.value:
            alert_title = (
                f"Readiness Triggers detected for {cyclone_name} in {country_disp}"
            )
        else:
            continue
        act: dict[str, str] | None = None
        if windspeed:
            act = {
                "districts48kt": ", ".join(exposed48),
                "districts64kt": ", ".join(exposed64),
                "windspeed": windspeed,
            }
        html, text = render_storm_mail(
            alert_title=alert_title,
            cyclone_name=cyclone_name,
            cyclone_time=cyclone_time,
            readiness=readiness,
            activated_triggers=act,
            redirect_url=prism_url,
        )
        asset_dir = __import__("pathlib").Path(__file__).resolve().parent / "assets"
        out.append(
            {
                "html": html,
                "text": text,
                "subject": alert_title,
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
                        "filename": "storm-map.jpg",
                        "content": base64.b64decode(b64),
                        "cid": "storm-image-cid",
                        "subtype": "jpeg",
                    },
                ],
            },
        )
    return out


def run_storm_worker(override_emails: list[str] | None = None) -> None:
    country = settings.aa_alert_country()
    is_test = bool(override_emails)
    with httpx.Client(verify=settings.http_verify_ssl(), timeout=120.0) as client:
        latest_reports = get_latest_available_reports(client)
        now = datetime.now(timezone.utc)
        with db.alerts_session() as conn:
            rows = db.fetch_aa_alerts(conn, country, "storm")
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
                logger.error("No storm AA for %s", country)
                return
            for alert in rows:
                last_states = alert.get("last_states")
                if not isinstance(last_states, dict):
                    last_states = {}
                filtered = filter_out_already_processed(
                    latest_reports,
                    last_states if not is_test else None,
                )
                payloads = build_email_payloads(
                    client,
                    filtered,
                    str(alert["prism_url"]),
                    list(alert["emails"]),
                    country,
                    is_test=is_test,
                )
                for p in payloads:
                    smtp_mailer.send_email(
                        from_addr="wfp.prism@wfp.org",
                        to_addrs="",
                        bcc=p["bcc"],
                        subject=p["subject"],
                        text_body=p["text"],
                        html_body=p["html"],
                        attachments=p["attachments"],
                    )
                if not is_test:
                    db.update_aa_alert(
                        conn,
                        alert_id=alert["id"],
                        last_states=transform_reports_to_last_processed(latest_reports),
                        last_ran_at=now,
                        last_triggered_at=now if payloads else None,
                    )
