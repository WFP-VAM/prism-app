"""AA storm/flood worker logic tests (ported from Node ``alerting`` Jest suites).

No ``PRISM_ALERTS_DATABASE_URL``, network, or Playwright required.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, patch

import httpx
import pytest
from prism_app.alert_workers.aa_flood import (
    build_flood_payload,
    fetch_station_summary,
    flood_prism_url,
    latest_flood_date,
    should_send_flood_email,
    transform_last_flood,
    transform_station_name,
)
from prism_app.alert_workers.aa_flood import _format_date as flood_format_date
from prism_app.alert_workers.aa_storm import (
    WindState,
    build_email_payloads,
    build_prism_storm_url,
    filter_out_already_processed,
    get_latest_available_reports,
    has_landfall_occurred,
    should_send_storm_email,
    transform_reports_to_last_processed,
)


def _mock_json_client(payload: Any) -> httpx.Client:
    response = MagicMock()
    response.json.return_value = payload
    response.raise_for_status = MagicMock()
    response.text = ""
    client = MagicMock(spec=httpx.Client)
    client.get.return_value = response
    return client


def _build_landfall_info(
    landfall_time: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "landfall_time": landfall_time or ["2025-01-13 06:00:00", "2025-01-13 18:00:00"],
        "landfall_impact_district": "Mogincual",
        "landfall_impact_intensity": [],
        "landfall_leadtime_hours": [0.0, 12.0],
        "is_coastal": True,
    }


def _build_detailed_report(
    *,
    landfall_detected: bool = False,
    status: str = WindState.monitoring.value,
    affected_48kt: list[str] | None = None,
    affected_64kt: list[str] | None = None,
    landfall_info: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "forecast_details": {
            "cyclone_name": "ELVIS",
            "season": 20242025,
            "reference_time": "2025-01-31T06:00:00Z",
            "basin": "SWI",
        },
        "landfall_detected": landfall_detected,
        "landfall_info": landfall_info if landfall_info is not None else {},
        "ready_set_results": {
            "status": status,
            "exposed_area_48kt": {
                "affected_districts": affected_48kt or [],
                "polygon": {"type": "Polygon", "coordinates": []},
            },
            "exposed_area_64kt": {
                "affected_districts": affected_64kt or [],
                "polygon": {"type": "Polygon", "coordinates": []},
            },
        },
        "uncertainty_cone": {"type": "Polygon", "coordinates": []},
        "time_series": {},
    }


# --- Storm: get_latest_available_reports ---


@pytest.mark.parametrize(
    ("dates_json", "expected"),
    [
        (
            {
                "2025-01-31": {
                    "elvis": [
                        {
                            "ref_time": "2025-01-31T06:00:00Z",
                            "state": "ready",
                            "path": "elvis/2025-01-31T06:00:00Z.json",
                        },
                    ],
                },
            },
            [
                {
                    "ref_time": "2025-01-31T06:00:00Z",
                    "state": "ready",
                    "path": "elvis/2025-01-31T06:00:00Z.json",
                },
            ],
        ),
        (
            {
                "2025-01-31": {
                    "elvis": [
                        {
                            "ref_time": "2025-01-31T06:00:00Z",
                            "state": "ready",
                            "path": "elvis/2025-01-31T06:00:00Z.json",
                        },
                        {
                            "ref_time": "2025-01-31T06:00:00Z",
                            "state": "monitoring",
                            "path": "elvis/2025-01-31T06:00:00Z.json",
                        },
                    ],
                },
            },
            [
                {
                    "ref_time": "2025-01-31T06:00:00Z",
                    "state": "ready",
                    "path": "elvis/2025-01-31T06:00:00Z.json",
                },
            ],
        ),
        (
            {
                "2025-01-31": {
                    "elvis": [
                        {
                            "ref_time": "2025-01-31T06:00:00Z",
                            "state": "monitoring",
                            "path": "elvis/2025-01-31T06:00:00Z.json",
                        },
                    ],
                },
            },
            [],
        ),
        (
            {
                "2025-01-30": {
                    "07-20242025": [
                        {
                            "ref_time": "2025-01-30T06:00:00Z",
                            "state": "activated_48kt",
                            "path": "07-20242025/2025-01-30T06:00:00Z.json",
                        },
                        {
                            "ref_time": "2025-01-30T12:00:00Z",
                            "state": "activated_64kt",
                            "path": "07-20242025/2025-01-30T12:00:00Z.json",
                        },
                    ],
                    "elvis": [
                        {
                            "ref_time": "2025-01-30T06:00:00Z",
                            "state": "activated_48kt",
                            "path": "elvis/2025-01-30T06:00:00Z.json",
                        },
                        {
                            "ref_time": "2025-01-30T18:00:00Z",
                            "state": "activated_64kt",
                            "path": "elvis/2025-01-30T18:00:00Z.json",
                        },
                    ],
                },
            },
            [
                {
                    "ref_time": "2025-01-30T12:00:00Z",
                    "state": "activated_64kt",
                    "path": "07-20242025/2025-01-30T12:00:00Z.json",
                },
                {
                    "ref_time": "2025-01-30T18:00:00Z",
                    "state": "activated_64kt",
                    "path": "elvis/2025-01-30T18:00:00Z.json",
                },
            ],
        ),
    ],
)
def test_get_latest_available_reports(dates_json: dict, expected: list) -> None:
    client = _mock_json_client(dates_json)
    assert get_latest_available_reports(client) == expected


def test_get_latest_available_reports_empty_on_fetch_failure() -> None:
    client = MagicMock(spec=httpx.Client)
    client.get.side_effect = httpx.HTTPError("fail")
    assert get_latest_available_reports(client) == []


# --- Storm: filter_out_already_processed (Node snapshots) ---


@pytest.mark.parametrize(
    ("available", "last_states", "expected"),
    [
        (
            [
                {
                    "ref_time": "2025-02-09T18:00:00Z",
                    "state": "monitoring",
                    "path": "vince/2025-02-09T18:00:00Z.json",
                },
            ],
            {"vince": {"status": "monitoring", "refTime": "2025-02-09T12:00:00Z"}},
            [
                {
                    "ref_time": "2025-02-09T18:00:00Z",
                    "state": "monitoring",
                    "path": "vince/2025-02-09T18:00:00Z.json",
                },
            ],
        ),
        (
            [
                {
                    "ref_time": "2025-02-09T18:00:00Z",
                    "state": "monitoring",
                    "path": "vince/2025-02-09T18:00:00Z.json",
                },
            ],
            {"vince": {"status": "monitoring", "refTime": "2025-02-09T18:00:00Z"}},
            [],
        ),
        (
            [
                {
                    "ref_time": "2025-02-09T18:00:00Z",
                    "state": "monitoring",
                    "path": "vince/2025-02-09T18:00:00Z.json",
                },
            ],
            None,
            [
                {
                    "ref_time": "2025-02-09T18:00:00Z",
                    "state": "monitoring",
                    "path": "vince/2025-02-09T18:00:00Z.json",
                },
            ],
        ),
        (
            [
                {
                    "ref_time": "2025-02-09T18:00:00Z",
                    "state": "monitoring",
                    "path": "vince/2025-02-09T18:00:00Z.json",
                },
                {
                    "ref_time": "2025-02-09T18:00:00Z",
                    "state": "monitoring",
                    "path": "chido/2025-02-09T18:00:00Z.json",
                },
            ],
            {
                "vince": {"status": "monitoring", "refTime": "2025-02-09T12:00:00Z"},
                "chido": {"status": "monitoring", "refTime": "2025-02-09T12:00:00Z"},
            },
            [
                {
                    "ref_time": "2025-02-09T18:00:00Z",
                    "state": "monitoring",
                    "path": "vince/2025-02-09T18:00:00Z.json",
                },
                {
                    "ref_time": "2025-02-09T18:00:00Z",
                    "state": "monitoring",
                    "path": "chido/2025-02-09T18:00:00Z.json",
                },
            ],
        ),
    ],
)
def test_filter_out_already_processed(
    available: list,
    last_states: dict | None,
    expected: list,
) -> None:
    assert filter_out_already_processed(available, last_states) == expected


def test_transform_reports_to_last_processed() -> None:
    reports = [
        {
            "ref_time": "2025-02-09T18:00:00Z",
            "state": "ready",
            "path": "vince/2025-02-09T18:00:00Z.json",
        },
    ]
    assert transform_reports_to_last_processed(reports) == {
        "vince": {"refTime": "2025-02-09T18:00:00Z", "status": "ready"},
    }


@pytest.mark.parametrize(
    ("status", "exposed48", "exposed64", "past_landfall", "expected"),
    [
        (WindState.ready.value, [], ["Namacurra"], False, True),
        (WindState.monitoring.value, [], ["Namacurra"], False, False),
        (WindState.activated_64kt.value, [], [], False, False),
        (WindState.activated_64kt.value, [], ["Namacurra"], True, False),
    ],
)
def test_should_send_storm_email(
    status: str,
    exposed48: list[str],
    exposed64: list[str],
    past_landfall: bool,
    expected: bool,
) -> None:
    assert should_send_storm_email(status, exposed48, exposed64, past_landfall) is expected


def test_has_landfall_occurred_skipped_in_test_mode() -> None:
    report = {"landfall_info": {"landfall_time": ["a", "2020-01-01T00:00:00Z"]}}
    assert has_landfall_occurred(report, is_test=True) is False


def test_has_landfall_occurred_after_second_timestamp() -> None:
    report = {
        "landfall_info": {
            "landfall_time": ["2025-01-13 06:00:00", "2020-01-01 00:00:00"],
        },
    }
    assert has_landfall_occurred(report, is_test=False) is True


def test_build_prism_storm_url() -> None:
    url = build_prism_storm_url(
        "https://prism.wfp.org/",
        "2025-01-31T06:00:00Z",
    )
    assert url == (
        "https://prism.wfp.org/?hazardLayerIds=anticipatory_action_storm&date=2025-01-31"
    )


@patch("prism_app.alert_workers.aa_storm.capture_screenshot_from_url", return_value="")
def test_build_email_payloads_readiness(mock_shot: MagicMock) -> None:
    short = [
        {
            "ref_time": "2025-01-31T06:00:00Z",
            "state": WindState.ready.value,
            "path": "elvis/2025-01-31T06:00:00Z.json",
        },
    ]
    detailed = _build_detailed_report(
        status=WindState.ready.value,
        affected_64kt=["Namacurra"],
    )
    client = _mock_json_client(detailed)
    payloads = build_email_payloads(
        client,
        short,
        "https://prism.wfp.org",
        ["test@test.com"],
        "mozambique",
        is_test=True,
    )
    assert len(payloads) == 1
    assert "Readiness Triggers" in payloads[0]["subject"]
    assert payloads[0]["bcc"] == ["test@test.com"]
    mock_shot.assert_called_once()


@patch("prism_app.alert_workers.aa_storm.capture_screenshot_from_url", return_value="")
def test_build_email_payloads_activation64(mock_shot: MagicMock) -> None:
    short = [
        {
            "ref_time": "2025-01-31T06:00:00Z",
            "state": WindState.activated_64kt.value,
            "path": "elvis/2025-01-31T06:00:00Z.json",
        },
    ]
    detailed = _build_detailed_report(
        status=WindState.activated_64kt.value,
        affected_64kt=["Namacurra"],
    )
    client = _mock_json_client(detailed)
    payloads = build_email_payloads(
        client,
        short,
        "https://prism.wfp.org",
        ["test@test.com"],
        "mozambique",
        is_test=True,
    )
    assert len(payloads) == 1
    assert "> 119 km/h" in payloads[0]["subject"]


@patch("prism_app.alert_workers.aa_storm.capture_screenshot_from_url", return_value="")
def test_build_email_payloads_activation48_no_pilot_districts(mock_shot: MagicMock) -> None:
    short = [
        {
            "ref_time": "2025-01-31T06:00:00Z",
            "state": WindState.activated_48kt.value,
            "path": "elvis/2025-01-31T06:00:00Z.json",
        },
    ]
    detailed = _build_detailed_report(
        status=WindState.activated_48kt.value,
        affected_48kt=["Angoche"],
    )
    client = _mock_json_client(detailed)
    payloads = build_email_payloads(
        client,
        short,
        "https://prism.wfp.org",
        ["test@test.com"],
        "mozambique",
        is_test=True,
    )
    assert payloads == []
    mock_shot.assert_not_called()


@patch("prism_app.alert_workers.aa_storm.capture_screenshot_from_url", return_value="")
def test_build_email_payloads_activation64_no_exposed_districts(mock_shot: MagicMock) -> None:
    short = [
        {
            "ref_time": "2025-01-31T06:00:00Z",
            "state": WindState.activated_64kt.value,
            "path": "elvis/2025-01-31T06:00:00Z.json",
        },
    ]
    detailed = _build_detailed_report(
        status=WindState.activated_64kt.value,
        affected_64kt=[],
    )
    client = _mock_json_client(detailed)
    assert (
        build_email_payloads(
            client,
            short,
            "https://prism.wfp.org",
            ["test@test.com"],
            "mozambique",
            is_test=True,
        )
        == []
    )


@patch("prism_app.alert_workers.aa_storm.capture_screenshot_from_url", return_value="")
def test_build_email_payloads_skips_after_landfall(mock_shot: MagicMock) -> None:
    short = [
        {
            "ref_time": "2025-01-31T06:00:00Z",
            "state": WindState.activated_64kt.value,
            "path": "elvis/2025-01-31T06:00:00Z.json",
        },
    ]
    detailed = _build_detailed_report(
        status=WindState.activated_64kt.value,
        affected_64kt=["Namacurra"],
        landfall_info=_build_landfall_info(
            landfall_time=["2025-01-13 06:00:00", "2020-01-01 00:00:00"],
        ),
    )
    client = _mock_json_client(detailed)
    assert (
        build_email_payloads(
            client,
            short,
            "https://prism.wfp.org",
            ["test@test.com"],
            "mozambique",
            is_test=False,
        )
        == []
    )


# --- Flood ---


@pytest.mark.parametrize(
    ("trigger", "expected"),
    [
        ("bankfull", True),
        ("moderate", True),
        ("severe", True),
        ("not exceeded", False),
        (None, False),
        ("", False),
    ],
)
def test_should_send_flood_email(trigger: str | None, expected: bool) -> None:
    assert should_send_flood_email(trigger) is expected


def test_latest_flood_date() -> None:
    dates = {
        "2025-01-10T00:00:00Z": {"trigger_status": "not exceeded"},
        "2025-01-15T00:00:00Z": {"trigger_status": "moderate"},
    }
    assert latest_flood_date(dates) == "2025-01-15T00:00:00Z"


def test_transform_last_flood() -> None:
    assert transform_last_flood("2025-01-15T00:00:00Z", "moderate") == {
        "moz_flood": {"status": "moderate", "refTime": "2025-01-15T00:00:00Z"},
    }


def test_transform_station_name() -> None:
    assert transform_station_name("beira_port") == "Beira Port"


def test_flood_format_date() -> None:
    assert flood_format_date("2025-03-05T12:00:00Z", "YYYY-MM-DD") == "2025-03-05"
    assert flood_format_date("2025-03-05T12:00:00Z", "DD-Month-YYYY") == "5-March-2025"


def test_flood_prism_url() -> None:
    url = flood_prism_url("https://prism.moz.wfp.org/", "2025-03-05")
    assert "hazardLayerIds=anticipatory_action_flood" in url
    assert "date=2025-03-05" in url


def test_fetch_station_summary_parses_csv() -> None:
    csv_text = (
        "station_name,station_id,river_name,trigger_status\n"
        "beira_port,1,zambezi,moderate\n"
    )
    client = MagicMock(spec=httpx.Client)
    response = MagicMock()
    response.text = csv_text
    response.raise_for_status = MagicMock()
    client.get.return_value = response
    rows = fetch_station_summary(client, "http://example/stations.csv")
    assert rows == [
        {
            "station_name": "Beira Port",
            "station_id": "1",
            "river_name": "zambezi",
            "trigger_status": "moderate",
        },
    ]


@patch(
    "prism_app.alert_workers.aa_flood.capture_screenshot_from_url",
    return_value="",
)
def test_build_flood_payload_not_exceeded(mock_shot: MagicMock) -> None:
    client = MagicMock(spec=httpx.Client)
    assert (
        build_flood_payload(
            client,
            date_iso="2025-01-15T00:00:00Z",
            trigger_status="not exceeded",
            prism_url="https://prism.moz.wfp.org/",
            emails=["a@x.com"],
            station_summary_url=None,
        )
        is None
    )
    mock_shot.assert_not_called()


@patch(
    "prism_app.alert_workers.aa_flood.capture_screenshot_from_url",
    return_value="",
)
def test_build_flood_payload_test_mode_not_exceeded(mock_shot: MagicMock) -> None:
    client = MagicMock(spec=httpx.Client)
    payload = build_flood_payload(
        client,
        date_iso="2025-01-15T00:00:00Z",
        trigger_status="not exceeded",
        prism_url="https://prism.moz.wfp.org/",
        emails=["a@x.com"],
        station_summary_url=None,
        is_test=True,
    )
    assert payload is not None
    assert payload["bcc"] == ["a@x.com"]
    mock_shot.assert_called_once()


@patch(
    "prism_app.alert_workers.aa_flood.capture_screenshot_from_url",
    return_value="",
)
def test_build_flood_payload_moderate(mock_shot: MagicMock) -> None:
    csv_text = (
        "station_name,station_id,river_name,trigger_status\n"
        "beira_port,1,zambezi,moderate\n"
    )
    client = MagicMock(spec=httpx.Client)
    response = MagicMock()
    response.text = csv_text
    response.raise_for_status = MagicMock()
    client.get.return_value = response

    payload = build_flood_payload(
        client,
        date_iso="2025-01-15T00:00:00Z",
        trigger_status="moderate",
        prism_url="https://prism.moz.wfp.org/",
        emails=["a@x.com"],
        station_summary_url="http://example/stations.csv",
    )
    assert payload is not None
    assert payload["bcc"] == ["a@x.com"]
    assert "moderate" in payload["html"].lower()
    mock_shot.assert_called_once()
