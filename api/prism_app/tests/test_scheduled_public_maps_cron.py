"""scheduled_public_maps_cron config and URL expansion."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import pytest
from prism_app.tests.fixtures.moz_export import MAP_EXPORT_FIXTURE_BASE_URL
from prism_app.workers.scheduled_public_maps.cron import (
    ScheduledPublicMapJobGroup,
    ScheduledPublicMapsFile,
    load_config,
    main,
)
from pydantic import ValidationError


def _repo_config_path() -> Path:
    """Committed default: ``workers/scheduled_public_maps/config/scheduled_public_maps.json``."""
    return (
        Path(__file__).resolve().parents[1]
        / "workers"
        / "scheduled_public_maps"
        / "config"
        / "scheduled_public_maps.json"
    )


def test_repo_config_loads_and_matches_schema() -> None:
    path = _repo_config_path()
    assert path.is_file(), f"expected example config at {path}"
    cfg = load_config(path)
    assert len(cfg.jobs) >= 1
    first = cfg.jobs[0]
    assert first.layer_ids
    assert "{date}" in first.export_url_template
    assert "{layer_id}" in first.export_url_template


def test_repo_config_dry_run() -> None:
    """End-to-end parse + expand; WMS lookup mocked (no network)."""
    path = _repo_config_path()
    assert path.is_file()

    def fake_latest(*_a, **_k):  # noqa: ANN001
        return "2026-04-21"

    with patch(
        "prism_app.workers.scheduled_public_maps.cron.latest_date_yyyy_mm_dd_for_layer",
        fake_latest,
    ):
        code = main(["--config", str(path), "--dry-run"])
    assert code == 0


def test_load_config_job_group(tmp_path: Path) -> None:
    body = {
        "jobs": [
            {
                "country": "mozambique",
                "layer_ids": ["precip_blended_dekad"],
                "export_url_template": f"{MAP_EXPORT_FIXTURE_BASE_URL}/export?date={{date}}&hazardLayerIds={{layer_id}}",
                "format": "pdf",
                "viewportWidth": 1200,
                "viewportHeight": 1028,
            }
        ]
    }
    path = tmp_path / "cfg.json"
    path.write_text(json.dumps(body), encoding="utf-8")
    cfg = ScheduledPublicMapsFile.model_validate(json.loads(path.read_text()))
    assert len(cfg.jobs) == 1
    assert cfg.jobs[0].layer_ids == ["precip_blended_dekad"]


def test_job_group_rejects_bad_template() -> None:
    with pytest.raises(ValidationError, match="must include"):
        ScheduledPublicMapJobGroup.model_validate(
            {
                "layer_ids": ["x"],
                "export_url_template": "https://x/export?date={date}",
            }
        )


def test_job_group_public_requires_country() -> None:
    with pytest.raises(ValidationError, match="country"):
        ScheduledPublicMapJobGroup.model_validate(
            {
                "public": True,
                "layer_ids": ["x"],
                "export_url_template": f"{MAP_EXPORT_FIXTURE_BASE_URL}/export?date={{date}}&hazardLayerIds={{layer_id}}",
            }
        )


def test_main_dry_run(tmp_path: Path) -> None:
    tmpl = f"{MAP_EXPORT_FIXTURE_BASE_URL}/export?date={{date}}&hazardLayerIds={{layer_id}}"
    cfg_path = tmp_path / "c.json"
    cfg_path.write_text(
        json.dumps(
            {
                "jobs": [
                    {
                        "layer_ids": ["precip_blended_dekad"],
                        "export_url_template": tmpl,
                        "format": "pdf",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    def fake_latest(*_a, **_k):  # noqa: ANN001
        return "2026-04-21"

    with patch(
        "prism_app.workers.scheduled_public_maps.cron.latest_date_yyyy_mm_dd_for_layer",
        fake_latest,
    ):
        code = main(["--config", str(cfg_path), "--dry-run"])
    assert code == 0
