"""Fetch per-layer time availability (WCS / WMS) for threshold alerts."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone

import httpx

from prism_app.alert_workers import settings
from prism_app.alert_workers.wcs_url import get_capabilities_url

logger = logging.getLogger(__name__)

_TIME_DIM_RE = re.compile(
    r"<(?:[^:>]+:)?Dimension[^>]*name=\"time\"[^>]*>([^<]+)</",
    re.IGNORECASE | re.DOTALL,
)
_TIME_EXTENT_RE = re.compile(
    r"<(?:[^:>]+:)?Extent[^>]*name=\"time\"[^>]*>([^<]+)</",
    re.IGNORECASE | re.DOTALL,
)
_GML_TIME_RE = re.compile(
    r"<(?:[^:>]+:)?timePosition[^>]*>([^<]+)</",
    re.IGNORECASE,
)
_NAME_RE = re.compile(
    r"<(?:[^:>]+:)?name[^>]*>([^<]+)</",
    re.IGNORECASE,
)


def _set_noon_utc_ms(iso_date: str) -> int:
    day = iso_date.split("T")[0]
    dt = datetime.fromisoformat(f"{day}T12:00:00+00:00")
    return int(dt.timestamp() * 1000)


def _parse_wms_layer_date_strings(layer_xml_fragment: str) -> list[str]:
    for rx in (_TIME_DIM_RE, _TIME_EXTENT_RE):
        m = rx.search(layer_xml_fragment)
        if m and m.group(1).strip():
            inner = m.group(1).strip()
            return [p.strip() for p in inner.split(",") if p.strip()]
    return []


def _wms_layer_fragment(capabilities_xml: str, layer_name: str) -> str | None:
    marker = f"<Name>{layer_name}</Name>"
    idx = capabilities_xml.find(marker)
    if idx < 0:
        short = layer_name.split(":")[-1]
        if short != layer_name:
            idx = capabilities_xml.find(f"<Name>{short}</Name>")
    if idx < 0:
        return None
    return capabilities_xml[idx : idx + 50_000]


def fetch_wms_layer_timestamps(
    base_url: str,
    server_layer_name: str,
    *,
    client: httpx.Client | None = None,
) -> list[int]:
    """Return sorted unique epoch-ms for a WMS layer (``type === 'wms'`` in alert config)."""
    wms_url = f"{base_url.rstrip('/')}/wms"
    cap_url = get_capabilities_url(wms_url, version="1.3.0")
    own_client = client is None
    c = client or httpx.Client(timeout=120.0, verify=settings.http_verify_ssl())
    try:
        r = c.get(cap_url)
        r.raise_for_status()
        xml = r.text
    finally:
        if own_client:
            c.close()
    frag = _wms_layer_fragment(xml, server_layer_name)
    if frag is None:
        logger.warning("WMS layer %r not found in capabilities", server_layer_name)
        return []
    dates = _parse_wms_layer_date_strings(frag)
    if not dates:
        return []
    ms = {_set_noon_utc_ms(d) for d in dates}
    return sorted(ms)


def _coverage_blocks(capabilities_xml: str) -> list[str]:
    blocks: list[str] = []
    for tag in ("CoverageOfferingBrief", "CoverageSummary"):
        pattern = re.compile(
            rf"<(?:[^:>]+:)?{tag}\b.*?</(?:[^:>]+:)?{tag}>",
            re.IGNORECASE | re.DOTALL,
        )
        blocks.extend(m.group(0) for m in pattern.finditer(capabilities_xml))
    return blocks


def _layer_id_from_coverage_block(block: str) -> str | None:
    m = _NAME_RE.search(block)
    if not m:
        return None
    return m.group(1).strip()


def _times_from_coverage_block(block: str) -> list[int]:
    raw: list[str] = []
    raw.extend(_GML_TIME_RE.findall(block))
    raw.extend(_parse_wms_layer_date_strings(block))
    if not raw:
        return []
    ms: set[int] = set()
    for s in raw:
        s = s.strip()
        if not s:
            continue
        try:
            if "T" in s:
                dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                ms.add(int(dt.timestamp() * 1000))
            else:
                ms.add(_set_noon_utc_ms(s))
        except ValueError:
            continue
    return sorted(ms)


def fetch_coverage_layer_days(
    base_url: str,
    *,
    client: httpx.Client | None = None,
) -> dict[str, list[int]]:
    """Map coverage id -> list of epoch-ms (``fetchCoverageLayerDays``)."""
    cap_url = get_capabilities_url(base_url, version="1.0.0")
    own_client = client is None
    c = client or httpx.Client(timeout=120.0, verify=settings.http_verify_ssl())
    try:
        r = c.get(cap_url)
        r.raise_for_status()
        xml = r.text
    finally:
        if own_client:
            c.close()
    out: dict[str, list[int]] = {}
    for block in _coverage_blocks(xml):
        lid = _layer_id_from_coverage_block(block)
        if not lid:
            continue
        times = _times_from_coverage_block(block)
        if lid in out and times:
            out[lid] = sorted(set(out[lid]) | set(times))
        elif times:
            out[lid] = times
        elif lid not in out:
            out[lid] = []
    return out
