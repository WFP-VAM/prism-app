"""Anticipatory Action flood worker (``aa-flood-alert``)."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import httpx
from prism_app.alert_workers import db, settings, smtp_mailer
from prism_app.alert_workers.browser_shot import Crop, capture_screenshot_from_url
from prism_app.alert_workers.mail_render import render_flood_mail

logger = logging.getLogger(__name__)

TRIGGER_STATUSES = ("not exceeded", "bankfull", "moderate", "severe")
DEFAULT_MOZ_DATES_URL = (
    "https://data.earthobservation.vam.wfp.org/public-share/aa/flood/moz/dates.json"
)
DEFAULT_FORECAST_ATTRIBUTION = "forecast by GloFAS with data processing by WFP"
DEFAULT_DISCLAIMER_AUTHORITY_HTML = (
    "<strong>INGD (Instituto Nacional de Gestão e Redução do Risco de Desastres)</strong>"
)
DEFAULT_DISCLAIMER_AUTHORITY_PLAIN = (
    "INGD (Instituto Nacional de Gestão e Redução do Risco de Desastres)"
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


def fetch_flood_dates_json(
    client: httpx.Client,
    url: str = DEFAULT_MOZ_DATES_URL,
) -> dict[str, Any]:
    try:
        r = client.get(url, timeout=120.0)
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


def flood_last_state_key(alert_id: int) -> str:
    return f"flood_alert_{alert_id}"


def strip_legacy_moz_flood_key(
    prev: dict[str, dict[str, str]] | None,
) -> dict[str, dict[str, str]]:
    if not prev:
        return {}
    rest = dict(prev)
    rest.pop("moz_flood", None)
    return rest


def forecast_lead_days_phrase(min_days: int, max_days: int) -> str:
    if min_days == max_days:
        return str(min_days)
    return f"{min_days} to {max_days}"


def _strip_html_tags(html: str) -> str:
    return re.sub(r"<[^>]*>", "", html).strip()


def resolve_flood_email_copy(
    *,
    country: str,
    metadata: dict[str, Any] | None,
) -> dict[str, str]:
    m = metadata or {}
    min_days = int(m.get("forecastLeadDaysMin") or 3)
    max_days = int(m.get("forecastLeadDaysMax") or 5)
    country_display = m.get("countryDisplayName") or country
    disclaimer_html = (
        m.get("disclaimerAuthorityHtml") or DEFAULT_DISCLAIMER_AUTHORITY_HTML
    )
    disclaimer_plain = m.get("disclaimerAuthorityPlain") or _strip_html_tags(
        str(disclaimer_html),
    ) or DEFAULT_DISCLAIMER_AUTHORITY_PLAIN
    return {
        "country_display_name": str(country_display),
        "forecast_lead_days_phrase": forecast_lead_days_phrase(min_days, max_days),
        "forecast_attribution_line": str(
            m.get("forecastAttributionLine") or DEFAULT_FORECAST_ATTRIBUTION,
        ),
        "disclaimer_authority_html": str(disclaimer_html),
        "disclaimer_authority_plain": str(disclaimer_plain),
        "map_alt_country": str(m.get("mapAltCountry") or country_display),
    }


def transform_last_processed_flood(
    date: str,
    trigger: str,
    last_state_key: str,
) -> dict[str, dict[str, str]]:
    return {last_state_key: {"status": trigger, "refTime": date}}


def station_summary_url(dates_url: str, station_file: str | None) -> str | None:
    if not station_file:
        return None
    base_dir = re.sub(r"dates\.json$", "", dates_url, flags=re.IGNORECASE)
    return f"{base_dir}{station_file}"


def build_flood_payload(
    client: httpx.Client,
    *,
    date_iso: str,
    trigger_status: str,
    prism_url: str,
    emails: list[str],
    station_summary_url: str | None,
    email_copy: dict[str, str],
) -> dict[str, Any] | None:
    if not should_send_flood_email(trigger_status):
        return None
    redirect = flood_prism_url(prism_url, _format_date(date_iso, "YYYY-MM-DD"))
    b64 = capture_screenshot_from_url(
        redirect,
        elements_to_hide=[".MuiDrawer-root", ".MuiList-root", ".MuiGrid-root"],
        crop=Crop(900, 50, 1000, 950),
    )
    title_date = _format_date(date_iso, "DD-Month-YYYY")
    country = email_copy["country_display_name"]
    title = (
        f"Flood Anticipatory Actions Trigger detected in {country} ({title_date})"
    )

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
        country_display_name=email_copy["country_display_name"],
        forecast_attribution_line=email_copy["forecast_attribution_line"],
        forecast_lead_days_phrase=email_copy["forecast_lead_days_phrase"],
        disclaimer_authority_html=email_copy["disclaimer_authority_html"],
        disclaimer_authority_plain=email_copy["disclaimer_authority_plain"],
        map_alt_country=email_copy["map_alt_country"],
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


def _tick_one_alert(
    client: httpx.Client,
    conn: Any,
    alert: dict[str, Any],
    *,
    override_emails: list[str] | None,
    now: datetime,
) -> None:
    meta = alert.get("metadata") or {}
    dates_url = meta.get("floodDatesUrl")
    if not isinstance(dates_url, str) or not dates_url:
        logger.error(
            "Skipping flood alert id=%s: metadata.floodDatesUrl missing or invalid",
            alert.get("id"),
        )
        return

    emails = override_emails or list(alert["emails"])
    dates = fetch_flood_dates_json(client, dates_url)
    latest = latest_flood_date(dates)
    last_states = alert.get("last_states") or {}
    if not isinstance(last_states, dict):
        last_states = {}

    def touch_ran_only(next_states: dict[str, dict[str, str]]) -> None:
        if override_emails:
            return
        db.update_aa_alert(
            conn,
            alert_id=alert["id"],
            last_states=next_states,
            last_ran_at=now,
            last_triggered_at=None,
        )

    if not latest:
        touch_ran_only(strip_legacy_moz_flood_key(last_states))
        return

    last_state_key = flood_last_state_key(int(alert["id"]))
    legacy = last_states.get("moz_flood")
    last_ref = (
        None
        if override_emails
        else (
            (last_states.get(last_state_key) or {}).get("refTime")
            or (legacy.get("refTime") if isinstance(legacy, dict) else None)
        )
    )
    is_new = not last_ref or datetime.fromisoformat(
        latest.replace("Z", "+00:00"),
    ) > datetime.fromisoformat(str(last_ref).replace("Z", "+00:00"))

    if not is_new:
        touch_ran_only(strip_legacy_moz_flood_key(last_states))
        return

    entry = dates[latest]
    trigger_status = str(entry.get("trigger_status") or "not exceeded")
    summary_url = station_summary_url(
        dates_url,
        entry.get("station_summary_file"),
    )
    email_copy = resolve_flood_email_copy(
        country=str(alert.get("country") or ""),
        metadata=meta if isinstance(meta, dict) else {},
    )
    payload = build_flood_payload(
        client,
        date_iso=latest,
        trigger_status=trigger_status,
        prism_url=str(alert["prism_url"]),
        emails=emails,
        station_summary_url=summary_url,
        email_copy=email_copy,
    )
    updated_last_states = {
        **strip_legacy_moz_flood_key(last_states),
        **transform_last_processed_flood(latest, trigger_status, last_state_key),
    }

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

    if not override_emails:
        db.update_aa_alert(
            conn,
            alert_id=alert["id"],
            last_states=updated_last_states,
            last_ran_at=now,
            last_triggered_at=now if payload else None,
        )


def run_flood_worker(override_emails: list[str] | None = None) -> None:
    now = datetime.now(timezone.utc)
    with httpx.Client(verify=settings.http_verify_ssl(), timeout=120.0) as client:
        with db.alerts_session() as conn:
            if override_emails:
                alerts = [
                    {
                        "id": 1,
                        "country": "Mozambique",
                        "emails": override_emails,
                        "prism_url": "https://prism.moz.wfp.org/",
                        "last_states": None,
                        "metadata": {"floodDatesUrl": DEFAULT_MOZ_DATES_URL},
                    },
                ]
            else:
                alerts = db.fetch_all_aa_alerts_by_type(conn, "flood")

            if not alerts:
                logger.error("No flood alert rows in anticipatory_action_alerts")
                return

            for alert in alerts:
                _tick_one_alert(
                    client,
                    conn,
                    alert,
                    override_emails=override_emails,
                    now=now,
                )
