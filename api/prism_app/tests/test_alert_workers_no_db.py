"""Alert worker tests that do not require ``PRISM_ALERTS_DATABASE_URL`` or Postgres.

Fast Ethereal (tiny PNG map): ``test_ethereal_live_preview_url_works`` runs locally with network;
skipped on CI unless ``PRISM_ALERTS_ETHEREAL_INTEGRATION=1``. Use ``pytest -m 'not network'`` offline.

Full HTML + real map + Node template parity: ``prism_app/tests/test_alert_email_e2e_ethereal.py`` with
``PRISM_ALERT_EMAIL_E2E=1`` (slow, Playwright).
"""

from __future__ import annotations

import base64
import os
import urllib.request
import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from prism_app.alert_workers import smtp_mailer
from prism_app.alert_workers.mail_render import (
    render_flood_mail,
    render_storm_mail,
    render_threshold_mail,
)
from prism_app.alert_workers.threshold_worker import (
    alert_message_from_stats,
    format_prism_url,
    geojson_bbox,
    scale_value,
)


def test_format_prism_url_merge_params() -> None:
    u = format_prism_url(
        "https://prism.example.org/", {"date": "2024-01-15", "hazardLayerIds": "7"}
    )
    assert "date=2024-01-15" in u
    assert "hazardLayerIds=7" in u
    assert u.startswith("https://prism.example.org/")


def test_scale_value_with_scale_offset() -> None:
    assert scale_value(10.0, 2.0, 1.0) == 21.0
    assert scale_value(10.0, None, None) == 10.0


def test_alert_message_from_stats_thresholds() -> None:
    msg = alert_message_from_stats(
        [{"stats_min": 0.5, "stats_max": 2.0}],
        alert_min=1,
        alert_max=None,
        wcs_config={},
    )
    assert msg is not None and "below" in msg.lower()

    msg2 = alert_message_from_stats(
        [{"stats_min": 0.0, "stats_max": 99.0}],
        alert_min=None,
        alert_max=50,
        wcs_config={},
    )
    assert msg2 is not None and "above" in msg2.lower()


def test_geojson_bbox_feature_collection() -> None:
    fc = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
                },
            }
        ],
    }
    b = geojson_bbox(fc)
    assert b == (0.0, 0.0, 1.0, 1.0)


def test_render_flood_mail_contains_title_and_link() -> None:
    html, text = render_flood_mail(
        title="Test flood title",
        trigger_status="moderate",
        stations_by_status={"moderate": ["Station A"]},
        redirect_url="https://prism.example/map",
    )
    assert "Test flood title" in html
    assert "moderate" in html.lower()
    assert "River discharge levels may exceed" in html
    assert "cid:arrow-forward-icon" in html
    assert "https://prism.example/map" in html
    assert "GloFAS with data processing" in html
    assert "Test flood title" in text


def test_render_storm_mail() -> None:
    html, text = render_storm_mail(
        alert_title="Storm alert",
        cyclone_name="Ada",
        cyclone_time="01/01/2024 12:00 UTC",
        readiness=True,
        activated_triggers={"windspeed": "> 119 km/h", "districts64kt": "A, B"},
        redirect_url="https://prism.example/storm",
    )
    assert "Storm alert" in html and "Ada" in html
    assert "Readiness Trigger: Activated" in html
    assert "ANTICIPATORY ACTION ALERT FOR TROPICAL STORM" in html
    assert "https://prism.example/storm" in html
    assert "Storm alert" in text


def test_render_threshold_mail_matches_aa_styling() -> None:
    html, text = render_threshold_mail(
        heading_title="PRISM Alert Triggered",
        alert_name="Area North",
        layer_title="Rainfall anomaly",
        layer_server_name="chirps_monthly",
        trigger_date="2026-05-15 00:00:00",
        stats_message="Maximum value 12.5 is above the threshold 10.",
        prism_url="https://prism.example/map?date=2026-05-15",
        deactivate_url="https://api.prism.example/alerts/1?deactivate=true",
    )
    assert "PRISM Alert Triggered" in html
    assert "rgba(99, 178, 189, 1)" in html
    assert "cid:arrow-forward-icon" in html
    assert "Maximum value 12.5" in html
    assert "Area North" in html
    assert "Rainfall anomaly" in text
    assert "chirps_monthly" in text


def test_send_email_no_credentials_logs_only(
    caplog: pytest.LogCaptureFixture,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    caplog.set_level("WARNING")
    monkeypatch.delenv("PRISM_ALERTS_EMAIL_USER", raising=False)
    monkeypatch.delenv("PRISM_ALERTS_EMAIL_PASSWORD", raising=False)
    smtp_mailer.send_email(
        from_addr="a@b.org",
        to_addrs="t@b.org",
        subject="s",
        text_body="hi",
    )
    assert any("skipping outbound mail" in r.message for r in caplog.records)


@patch("prism_app.alert_workers.smtp_mailer.smtplib.SMTP_SSL")
def test_send_email_uses_ssl_when_creds_set(
    mock_ssl: MagicMock, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("PRISM_ALERTS_EMAIL_USER", "u")
    monkeypatch.setenv("PRISM_ALERTS_EMAIL_PASSWORD", "p")
    monkeypatch.setenv("PRISM_ALERTS_EMAIL_HOST", "smtp.example.com")
    monkeypatch.setenv("PRISM_ALERTS_EMAIL_STARTTLS", "false")
    monkeypatch.setenv("PRISM_ALERTS_EMAIL_PORT", "465")

    inst = mock_ssl.return_value.__enter__.return_value
    smtp_mailer.send_email(
        from_addr="from@x.org",
        to_addrs="to@x.org",
        subject="sub",
        text_body="text",
        html_body="<p>html</p>",
    )
    mock_ssl.assert_called_once()
    assert mock_ssl.call_args[0][0] == "smtp.example.com"
    assert mock_ssl.call_args[0][1] == 465
    inst.login.assert_called_once_with("u", "p")
    inst.send_message.assert_called_once()


def test_parse_ethereal_msgid_from_smtp_reply() -> None:
    token = "YpXX5N-8J14cOJVHYpXjvw93heVfMHMGAAAAA4okSTkzId5ci.tBPvM2244"
    # smtplib ``getreply`` drops the ``250 `` prefix; Ethereal sends ``Accepted`` before bracket.
    raw = f"Accepted [STATUS=new MSGID={token}]".encode()
    assert smtp_mailer._parse_ethereal_msgid_from_smtp_reply(raw) == token

    multiline = b"Ok queued as test\nAccepted [STATUS=new MSGID=multi-line-token]"
    assert smtp_mailer._parse_ethereal_msgid_from_smtp_reply(multiline) == (
        "multi-line-token"
    )

    assert smtp_mailer._parse_ethereal_msgid_from_smtp_reply(b"250 OK") is None


@patch("prism_app.alert_workers.smtp_mailer.httpx.post")
def test_create_ethereal_test_account_sends_nodemailer_payload(
    mock_post: MagicMock,
) -> None:
    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "status": "success",
        "user": "u@ethereal.email",
        "pass": "x",
        "smtp": {"host": "smtp.ethereal.email", "port": 587, "secure": False},
        "web": "https://ethereal.email",
    }
    mock_resp.raise_for_status = MagicMock()
    mock_post.return_value = mock_resp

    acc = smtp_mailer.create_ethereal_test_account()
    assert acc["user"] == "u@ethereal.email"
    kwargs = mock_post.call_args[1]
    assert kwargs["json"]["requestor"] == smtp_mailer._ETHEREAL_REQUESTOR
    assert kwargs["json"]["version"]


@patch("prism_app.alert_workers.smtp_mailer.CapturingSMTP")
def test_send_email_ethereal_host_uses_starttls(
    mock_smtp: MagicMock,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level("INFO")
    monkeypatch.setenv("PRISM_ALERTS_EMAIL_USER", "eth")
    monkeypatch.setenv("PRISM_ALERTS_EMAIL_PASSWORD", "secret")
    monkeypatch.setenv("PRISM_ALERTS_EMAIL_HOST", "smtp.ethereal.email")

    inst = mock_smtp.return_value.__enter__.return_value

    def _send(*_a: object, **_kw: object) -> None:
        inst.last_smtp_data_reply = (
            b"Accepted [STATUS=new MSGID=unit-test-token-for-log-only]\r\n"
        )

    inst.send_message.side_effect = _send

    smtp_mailer.send_email(
        from_addr="from@x.org",
        to_addrs="to@x.org",
        subject="sub",
        text_body="text",
    )
    mock_smtp.assert_called_once()
    assert mock_smtp.call_args[0][0] == "smtp.ethereal.email"
    assert mock_smtp.call_args[0][1] == 587
    inst.starttls.assert_called_once()
    inst.login.assert_called_once_with("eth", "secret")
    inst.send_message.assert_called_once()
    assert any(
        "Ethereal message preview: https://ethereal.email/message/unit-test-token-for-log-only"
        in r.message
        for r in caplog.records
    )


_in_ci = os.environ.get("CI", "").lower() in ("true", "1", "yes")
_force_ethereal = os.environ.get("PRISM_ALERTS_ETHEREAL_INTEGRATION", "").lower() in (
    "1",
    "true",
    "yes",
)


_ALERT_ASSETS = Path(__file__).resolve().parents[1] / "alert_workers" / "assets"
# Minimal PNG — stands in for Playwright map capture in ``build_flood_payload``.
_MIN_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
)


@pytest.mark.network
@pytest.mark.skipif(
    _in_ci and not _force_ethereal,
    reason="Live Ethereal skipped on CI (set PRISM_ALERTS_ETHEREAL_INTEGRATION=1 to run)",
)
def test_ethereal_live_preview_url_works(
    capsys: pytest.CaptureFixture, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("PRISM_ALERTS_USE_ETHEREAL", "true")
    token = str(uuid.uuid4())
    title = f"Flood AA integration preview ({token})"
    html, text = render_flood_mail(
        title=title,
        trigger_status="moderate",
        stations_by_status={
            "moderate": ["Station Alpha", "Station Beta"],
        },
        redirect_url=f"https://prism.example.org/?ethereal-test={token}",
    )
    attachments = [
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
            "filename": "flood-image.png",
            "content": _MIN_PNG,
            "cid": "flood-image-cid",
            "subtype": "png",
        },
    ]
    smtp_mailer.send_email(
        from_addr="wfp.prism@wfp.org",
        to_addrs="visual-check@example.com",
        subject=title,
        text_body=text,
        html_body=html,
        attachments=attachments,
    )
    out = capsys.readouterr().out
    lines = [ln.strip() for ln in out.strip().splitlines() if ln.strip()]
    previews = [ln for ln in lines if ln.startswith("https://ethereal.email/message/")]
    assert previews, f"expected Ethereal preview URL on stdout, got: {out!r}"

    preview = previews[-1]
    req = urllib.request.Request(
        preview, headers={"User-Agent": "prism-pytest-ethereal-integration"}
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        assert resp.status == 200
        page = resp.read().decode("utf-8", errors="replace")
    low = page.lower()
    assert token.lower() in low, "preview should list subject/body token"
    assert "station alpha" in low
    assert "access dashboard" in low
