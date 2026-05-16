"""Threshold email alerts (``alert-worker.ts``)."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import httpx
from prism_app.alert_workers import db, layer_days, mail_render, settings, smtp_mailer
from prism_app.alert_workers.wcs_url import create_get_coverage_url
from shapely import ops
from shapely.geometry import shape as sh_shape

logger = logging.getLogger(__name__)

_ASSET_DIR = Path(__file__).resolve().parent / "assets"


def format_prism_url(prism_url: str, params: dict[str, str]) -> str:
    p = urlparse(prism_url)
    q = dict(parse_qsl(p.query, keep_blank_values=True))
    q.update({k: str(v) for k, v in params.items()})
    new_q = urlencode(q)
    return urlunparse((p.scheme, p.netloc, p.path, p.params, new_q, p.fragment))


def geojson_bbox(zones: dict[str, Any]) -> tuple[float, float, float, float]:
    if zones.get("type") == "FeatureCollection":
        geoms = [sh_shape(f["geometry"]) for f in zones.get("features", [])]
        if not geoms:
            raise ValueError("empty FeatureCollection")
        return ops.unary_union(geoms).bounds
    return sh_shape(zones).bounds


def fetch_stats(
    api_url: str,
    payload: dict[str, Any],
    *,
    client: httpx.Client,
) -> list[dict[str, Any]] | None:
    r = client.post(f"{api_url}/stats", json=payload, timeout=600.0)
    if r.status_code != 200:
        logger.error("stats failed: %s %s", r.status_code, r.text[:500])
        return None
    data = r.json()
    if not isinstance(data, list):
        logger.warning("aggregateData is not a list: %r", data)
        return None
    return data


def scale_value(value: float, scale: float | None, offset: float | None) -> float:
    if scale is not None and offset is not None:
        return value * scale + offset
    return value


def alert_message_from_stats(
    aggregate_data: list[dict[str, Any]],
    alert_min: int | None,
    alert_max: int | None,
    wcs_config: dict[str, Any],
) -> str | None:
    scale = wcs_config.get("scale")
    offset = wcs_config.get("offset")
    msg: str | None = None
    for row in aggregate_data:
        raw_min = row.get("stats_min")
        raw_max = row.get("stats_max")
        if raw_min is None or raw_max is None:
            continue
        min_v = scale_value(float(raw_min), scale, offset)
        max_v = scale_value(float(raw_max), scale, offset)
        if alert_min is not None and min_v < alert_min:
            msg = f"Minimum value {min_v} is below the threshold {alert_min}."
        if alert_max is not None and max_v > alert_max:
            msg = f"Maximum value {max_v} is above the threshold {alert_max}."
    return msg


def calculate_alert(
    max_date: datetime,
    alert: dict[str, Any],
    *,
    api_url: str,
    client: httpx.Client,
) -> str | None:
    zones = alert.get("zones")
    if not zones:
        logger.warning("No zones for alert %s", alert.get("id"))
        return None
    cfg = alert["alert_config"]
    layer = cfg
    extent = geojson_bbox(zones)
    geotiff_url = create_get_coverage_url(
        bbox=(extent[0], extent[1], extent[2], extent[3]),
        date=max_date,
        layer_id=layer["serverLayerName"],
        url=layer["baseUrl"],
    )
    payload = {"geotiff_url": str(geotiff_url), "zones": zones}
    data = fetch_stats(api_url, payload, client=client)
    if not data:
        return None
    return alert_message_from_stats(
        data,
        alert.get("min"),
        alert.get("max"),
        cfg.get("wcsConfig") or {},
    )


def layer_available_timestamps(
    alert: dict[str, Any], client: httpx.Client
) -> list[int]:
    cfg = alert["alert_config"]
    base = cfg["baseUrl"]
    name = cfg["serverLayerName"]
    if cfg.get("type") == "wms":
        return layer_days.fetch_wms_layer_timestamps(base, name, client=client)
    days = layer_days.fetch_coverage_layer_days(base, client=client)
    return days.get(name, [])


def _as_naive_utc(dt: datetime) -> datetime:
    if dt.tzinfo:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def process_alert_row(
    alert: dict[str, Any], api_url: str, client: httpx.Client, conn: Any
) -> None:
    cfg = alert["alert_config"]
    aid = alert["id"]
    last_triggered = alert.get("last_triggered")
    created_at = alert["created_at"]
    if isinstance(created_at, datetime):
        created = created_at
    else:
        created = datetime.fromisoformat(str(created_at).replace("Z", "+00:00"))

    timestamps = layer_available_timestamps(alert, client)
    if not timestamps:
        logger.warning(
            "No dates for %s %s",
            cfg.get("baseUrl"),
            cfg.get("serverLayerName"),
        )
        return
    max_ms = max(timestamps)
    max_date = datetime.utcfromtimestamp(max_ms / 1000.0)
    max_date = max_date.replace(tzinfo=None)

    if last_triggered:
        lt = last_triggered
        if isinstance(lt, str):
            lt = datetime.fromisoformat(lt.replace("Z", "+00:00"))
        assert isinstance(lt, datetime)
        lt = _as_naive_utc(lt)
        if lt >= max_date:
            logger.info("Alert %s — no new data", aid)
            return

    created_n = _as_naive_utc(created)
    if created_n >= max_date:
        logger.info("Alert %s — created_at gating", aid)
        return

    max_date_aware = max_date.replace(tzinfo=timezone.utc)
    msg = calculate_alert(max_date_aware, alert, api_url=api_url, client=client)
    hazard_id = cfg["id"]
    deactivate = f"{api_url}/alerts/{aid}?deactivate=true&email={alert['email']}"
    url_params = format_prism_url(
        alert["prism_url"],
        {
            "hazardLayerIds": str(hazard_id),
            "date": max_date_aware.isoformat()[:10],
        },
    )

    if msg:
        html_body, text_body = mail_render.render_threshold_mail(
            heading_title="PRISM Alert Triggered",
            alert_name=str(alert["alert_name"]) if alert.get("alert_name") else None,
            layer_title=str(cfg.get("title", "layer")),
            layer_server_name=str(cfg["serverLayerName"]),
            trigger_date=str(max_date),
            stats_message=msg,
            prism_url=url_params,
            deactivate_url=deactivate,
        )
        smtp_mailer.send_email(
            from_addr="wfp.prism@wfp.org",
            to_addrs=alert["email"],
            subject="PRISM Alert Triggered",
            text_body=text_body,
            html_body=html_body,
            attachments=[
                {
                    "filename": "arrow-forward-icon.png",
                    "path": _ASSET_DIR / "arrowForwardIcon.png",
                    "cid": "arrow-forward-icon",
                },
            ],
        )
        logger.info("Alert %s triggered", aid)
    else:
        logger.info("Alert %s not triggered (stats)", aid)

    db.update_alert_last_triggered(conn, aid, max_date)


def run_threshold_alert_worker() -> None:
    api_url = settings.api_base_url()
    with httpx.Client(verify=settings.http_verify_ssl(), timeout=120.0) as client:
        with db.alerts_session() as conn:
            alerts = db.fetch_active_alerts(conn)
            logger.info("Processing %s active alerts", len(alerts))
            for alert in alerts:
                try:
                    process_alert_row(alert, api_url, client, conn)
                except Exception:
                    logger.exception("Error processing alert %s", alert.get("id"))
