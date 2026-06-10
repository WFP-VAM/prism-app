"""Fetch available coverage timestamps per layer via WMS GetCapabilities (alert-worker parity).

Uses the WFP Humanitarian Data Cube OWS gateway
``https://api.earthobservation.vam.wfp.org/ows/`` (WMS) — same stack as
frontend ``…/ows/wms`` in ``prism.json``.

Alert reference: ``alerting/src/alert-worker.ts`` → ``WMS.getLayerDays()`` then max date.
"""

from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from urllib.parse import urlencode

import requests

logger = logging.getLogger(__name__)

DEFAULT_WMS_OWS_ROOT = "https://api.earthobservation.vam.wfp.org/ows"


def wms_ows_root() -> str:
    return DEFAULT_WMS_OWS_ROOT.rstrip("/")


def _local_tag(tag: str) -> str:
    if tag.startswith("{"):
        return tag.split("}", 1)[-1]
    return tag


def _normalize_wms_service_url(base_url: str) -> str:
    base = base_url.rstrip("/")
    if base.lower().endswith("/wms"):
        return base
    return f"{base}/wms"


def _dt_to_utc_noon_ms(val: datetime) -> int:
    utc = val.astimezone(UTC) if val.tzinfo else val.replace(tzinfo=UTC)
    noon = utc.replace(hour=12, minute=0, second=0, microsecond=0)
    return int(noon.timestamp() * 1000)


def _parse_iso_to_utc_noon_ms(raw: str) -> int:
    s = raw.strip()
    if not s:
        raise ValueError("empty date string")
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    dt = datetime.fromisoformat(s)
    return _dt_to_utc_noon_ms(dt)


def _merge_layer_times(
    acc: dict[str, list[int]], layer_name: str, timestamps: list[int]
) -> None:
    if layer_name not in acc:
        acc[layer_name] = []
    seen = set(acc[layer_name])
    for ts in timestamps:
        if ts not in seen:
            seen.add(ts)
            acc[layer_name].append(ts)


def parse_wms_capabilities_layer_days(cap_xml: str) -> dict[str, list[int]]:
    """Parse GetCapabilities XML; return layer_id -> list of UTC-noon epoch ms."""
    try:
        root = ET.fromstring(cap_xml)
    except ET.ParseError as exc:
        raise ValueError("invalid WMS capabilities XML") from exc

    by_layer: dict[str, list[int]] = {}
    for layer_el in root.iter():
        if _local_tag(layer_el.tag) != "Layer":
            continue
        name_val: str | None = None
        for c in layer_el:
            if _local_tag(c.tag) == "Name" and c.text and c.text.strip():
                name_val = c.text.strip()
                break
        if not name_val:
            continue
        date_strings: list[str] = []
        for c in layer_el:
            tag = _local_tag(c.tag)
            if tag == "Dimension" and c.get("name") == "time" and c.text:
                date_strings.extend(p.strip() for p in c.text.split(",") if p.strip())
            elif tag == "Extent" and c.get("name") == "time" and c.text:
                date_strings.extend(p.strip() for p in c.text.split(",") if p.strip())
        if not date_strings:
            continue
        try:
            ms = [_parse_iso_to_utc_noon_ms(d) for d in date_strings]
        except ValueError:
            logger.warning("Could not parse WMS time values for layer %s", name_val)
            continue
        _merge_layer_times(by_layer, name_val, ms)
    return by_layer


def fetch_capabilities_xml(url: str, *, timeout_sec: float) -> str:
    r = requests.get(url, timeout=timeout_sec)
    r.raise_for_status()
    return r.text


def fetch_layer_days_map(*, timeout_sec: float = 120.0) -> dict[str, list[int]]:
    """Download WMS GetCapabilities from the configured OWS root."""
    service = _normalize_wms_service_url(wms_ows_root())
    q = urlencode({"service": "WMS", "request": "GetCapabilities", "version": "1.1.0"})
    cap_url = f"{service}?{q}"
    xml_text = fetch_capabilities_xml(cap_url, timeout_sec=timeout_sec)
    return parse_wms_capabilities_layer_days(xml_text)


def collect_times_for_layer_id(
    days_map: dict[str, list[int]],
    layer_id: str,
) -> list[int]:
    """Match alerting's ``availableDates[serverLayerName]`` with flexible id forms."""
    needle = layer_id.strip()
    needle_norm = needle.replace("__", ":")
    out: list[int] = []
    for key, vals in days_map.items():
        key_norm = key.replace("__", ":")
        if (
            key == needle
            or key_norm == needle_norm
            or key.endswith(needle)
            or key_norm.endswith(needle_norm)
        ):
            out.extend(vals)
    return out


def latest_date_yyyy_mm_dd_for_layer(
    layer_id: str,
    *,
    timeout_sec: float = 120.0,
) -> str | None:
    """
    Latest calendar date (UTC, date portion of max timestep) for a layer, like
    ``new Date(maxDate)`` before threshold checks in alerting.
    """
    try:
        m = fetch_layer_days_map(timeout_sec=timeout_sec)
    except requests.RequestException as exc:
        logger.warning("WMS capabilities fetch failed: %s", exc)
        return None
    times = collect_times_for_layer_id(m, layer_id)
    if not times:
        logger.warning(
            "no capability dates for layer_id=%s (ows=%s)",
            layer_id,
            wms_ows_root(),
        )
        return None
    max_ms = max(times)
    dt = datetime.fromtimestamp(max_ms / 1000.0, tz=UTC)
    return dt.date().isoformat()
