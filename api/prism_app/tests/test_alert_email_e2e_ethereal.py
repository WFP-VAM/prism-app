"""E2E tool: production AA email layout (Node ``alerting`` EJS parity) + real map + Ethereal.

Needs Playwright Chromium, network, ~1–3+ minutes for map tiles.

Docker (api image has Chromium + ``playwright install-deps``)::

    make -C api api-alert-email-e2e
    # or: cd api && ./scripts/alert_email_ethereal_e2e_docker.sh

Bare metal (venv with Playwright)::

    cd api && PRISM_ALERT_EMAIL_E2E=1 PYTHONPATH=. poetry run pytest \\
        prism_app/tests/test_alert_email_e2e_ethereal.py -v -s

Env:

- ``PRISM_E2E_PRISM_BASE_URL`` — default ``https://prism.moz.wfp.org/``
- ``PRISM_E2E_FLOOD_DATE`` — optional ISO date key (else latest from ``dates.json``)
- ``PRISM_E2E_MAP_WAIT_MS`` — tile wait before screenshot (default ``8000``)
- ``PRISM_E2E_STORM_SCREENSHOT_URL`` — optional full PRISM storm URL for second test

Stdout prints the Ethereal preview URL(s). Open that URL in a browser to see HTML + images;
plain ``urllib`` only gets Ethereal’s JS shell, not the rendered message body.
"""

from __future__ import annotations

import base64
import os
import urllib.request
import uuid
from pathlib import Path

import httpx
import pytest

from prism_app.alert_workers import smtp_mailer
from prism_app.alert_workers.aa_flood import (
    _format_date,  # noqa: PLC2701
    fetch_flood_dates_json,
    flood_prism_url,
    latest_flood_date,
)
from prism_app.alert_workers.browser_shot import Crop, capture_screenshot_from_url
from prism_app.alert_workers.mail_render import render_flood_mail, render_storm_mail

_ALERT_ASSETS = Path(__file__).resolve().parents[1] / "alert_workers" / "assets"

_force = os.environ.get("PRISM_ALERT_EMAIL_E2E", "").lower() in (
    "1",
    "true",
    "yes",
)


def _assert_ethereal_preview_url_reachable(url: str) -> None:
    """Ethereal serves a client-rendered viewer; GET only checks the shell loads (HTTP 200)."""
    assert "/message/" in url
    req = urllib.request.Request(
        url, headers={"User-Agent": "prism-pytest-alert-email-e2e"}
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        assert resp.status == 200
        body = resp.read().decode("utf-8", errors="replace")
    low = body.lower()
    assert "ethereal" in low
    assert len(body) > 1500


@pytest.mark.e2e
@pytest.mark.network
@pytest.mark.skipif(
    not _force,
    reason="Set PRISM_ALERT_EMAIL_E2E=1 for Playwright + Ethereal (slow)",
)
def test_e2e_ethereal_flood_alert_with_real_map(
    capsys: pytest.CaptureFixture,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PRISM_ALERTS_USE_ETHEREAL", "true")
    token = str(uuid.uuid4())
    base = os.environ.get("PRISM_E2E_PRISM_BASE_URL", "https://prism.moz.wfp.org/")
    wait_ms = int(os.environ.get("PRISM_E2E_MAP_WAIT_MS", "8000"))

    with httpx.Client(timeout=120.0, verify=True) as client:
        if env_date := os.environ.get("PRISM_E2E_FLOOD_DATE"):
            latest = env_date
            trigger = os.environ.get("PRISM_E2E_FLOOD_TRIGGER", "moderate")
            stations_by_status: dict[str, list[str]] = {}
        else:
            dates = fetch_flood_dates_json(client)
            latest = latest_flood_date(dates) or ""
            assert latest, "No flood dates from public API (set PRISM_E2E_FLOOD_DATE)"
            entry = dates.get(latest) or {}
            trigger = str(entry.get("trigger_status") or "moderate")
            stations_by_status = {}

    day = _format_date(latest, "YYYY-MM-DD")
    redirect = flood_prism_url(base, day)
    title_date = _format_date(latest, "DD-Month-YYYY")
    title = (
        f"Flood Anticipatory Actions Trigger detected in Mozambique ({title_date}) "
        f"[e2e {token}]"
    )

    b64 = capture_screenshot_from_url(
        redirect,
        elements_to_hide=[".MuiDrawer-root", ".MuiList-root", ".MuiGrid-root"],
        crop=Crop(900, 50, 1000, 950),
        extra_wait_ms=wait_ms,
    )
    raw_map = base64.b64decode(b64)
    assert len(raw_map) > 5000, "map capture unexpectedly small (tiles loaded?)"

    html, text = render_flood_mail(
        title=title,
        trigger_status=trigger,
        stations_by_status=stations_by_status,
        redirect_url=redirect,
    )
    smtp_mailer.send_email(
        from_addr="wfp.prism@wfp.org",
        to_addrs="e2e-flood@example.com",
        subject=title,
        text_body=text,
        html_body=html,
        attachments=[
            {
                "filename": "map-icon.png",
                "path": _ALERT_ASSETS / "mapIcon.png",
                "cid": "map-icon",
            },
            {
                "filename": "arrow-forward-icon.png",
                "path": _ALERT_ASSETS / "arrowForwardIcon.png",
                "cid": "arrow-forward-icon",
            },
            {
                "filename": "flood-map.jpg",
                "content": raw_map,
                "cid": "flood-image-cid",
                "subtype": "jpeg",
            },
        ],
    )
    out = capsys.readouterr().out
    previews = [
        ln.strip()
        for ln in out.splitlines()
        if ln.strip().startswith("https://ethereal.email/message/")
    ]
    assert previews, f"no preview URL on stdout: {out!r}"
    preview = previews[-1]
    print("E2E flood Ethereal preview:", preview, flush=True)
    _assert_ethereal_preview_url_reachable(preview)


_storm_url = os.environ.get("PRISM_E2E_STORM_SCREENSHOT_URL", "").strip()


@pytest.mark.e2e
@pytest.mark.network
@pytest.mark.skipif(
    not _force,
    reason="Set PRISM_ALERT_EMAIL_E2E=1 for Playwright + Ethereal (slow)",
)
@pytest.mark.skipif(
    not _storm_url,
    reason="Set PRISM_E2E_STORM_SCREENSHOT_URL to a full PRISM AA storm map URL",
)
def test_e2e_ethereal_storm_alert_with_real_map(
    capsys: pytest.CaptureFixture,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PRISM_ALERTS_USE_ETHEREAL", "true")
    token = str(uuid.uuid4())
    wait_ms = int(os.environ.get("PRISM_E2E_MAP_WAIT_MS", "8000"))
    cyclone_name = os.environ.get("PRISM_E2E_STORM_CYCLONE_NAME", "E2ECyclone")
    cyclone_time = os.environ.get(
        "PRISM_E2E_STORM_TIME",
        "15/05/2026 12:00 UTC",
    )
    readiness = os.environ.get("PRISM_E2E_STORM_READINESS", "true").lower() in (
        "1",
        "true",
        "yes",
    )
    with_activation = os.environ.get("PRISM_E2E_STORM_ACTIVATED", "true").lower() in (
        "1",
        "true",
        "yes",
    )
    activated = (
        {
            "districts48kt": "District A",
            "districts64kt": os.environ.get(
                "PRISM_E2E_STORM_DISTRICTS64",
                "Gaza, Inhambane",
            ),
            "windspeed": "> 119 km/h",
        }
        if with_activation
        else None
    )

    b64 = capture_screenshot_from_url(
        _storm_url,
        elements_to_hide=[".MuiDrawer-root", ".MuiList-root", ".MuiGrid-root"],
        crop=Crop(900, 50, 1000, 950),
        extra_wait_ms=wait_ms,
    )
    raw_map = base64.b64decode(b64)
    assert len(raw_map) > 5000, "storm map capture unexpectedly small"

    alert_title = f"E2E storm alert for {cyclone_name} in Mozambique [e2e {token}]"
    html, text = render_storm_mail(
        alert_title=alert_title,
        cyclone_name=cyclone_name,
        cyclone_time=cyclone_time,
        readiness=readiness,
        activated_triggers=activated,
        redirect_url=_storm_url,
    )
    smtp_mailer.send_email(
        from_addr="wfp.prism@wfp.org",
        to_addrs="e2e-storm@example.com",
        subject=alert_title,
        text_body=text,
        html_body=html,
        attachments=[
            {
                "filename": "map-icon.png",
                "path": _ALERT_ASSETS / "mapIcon.png",
                "cid": "map-icon",
            },
            {
                "filename": "arrow-forward-icon.png",
                "path": _ALERT_ASSETS / "arrowForwardIcon.png",
                "cid": "arrow-forward-icon",
            },
            {
                "filename": "storm-map.jpg",
                "content": raw_map,
                "cid": "storm-image-cid",
                "subtype": "jpeg",
            },
        ],
    )
    out = capsys.readouterr().out
    previews = [
        ln.strip()
        for ln in out.splitlines()
        if ln.strip().startswith("https://ethereal.email/message/")
    ]
    assert previews, f"no preview URL on stdout: {out!r}"
    preview = previews[-1]
    print("E2E storm Ethereal preview:", preview, flush=True)
    _assert_ethereal_preview_url_reachable(preview)
