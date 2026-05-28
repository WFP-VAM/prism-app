"""Schedule model validation for scheduled batch maps."""

from __future__ import annotations

import pytest
from prism_app.database.map_export_schedule_model import (
    MapExportSchedule,
    MapExportScheduleStatus,
)
from pydantic import ValidationError


def _schedule_payload() -> dict[str, object]:
    return {
        "name": "Mozambique rainfall monthly PDF",
        "country": "mozambique",
        "layer_id": "precip_blended_dekad",
        "cadence": "monthly",
        "export_url": "https://prism.moz.wfp.org/export?date={date}&hazardLayerIds={layer_id}",
        "format": "pdf",
        "export_options": {
            "origin": "https://prism.moz.wfp.org",
            "exportPath": "/export",
            "viewportWidth": 1200,
            "viewportHeight": 1697,
        },
    }


def test_admin_repr_accepts_status_as_str_or_enum() -> None:
    schedule = MapExportSchedule.model_validate(_schedule_payload())
    schedule.status = MapExportScheduleStatus.active
    assert schedule.__admin_repr__(None) == f"{schedule.name} (active)"

    schedule.status = "stopped"  # type: ignore[assignment]
    assert schedule.__admin_repr__(None) == f"{schedule.name} (stopped)"


def test_schedule_export_url_requires_date_and_layer_placeholders() -> None:
    payload = {
        **_schedule_payload(),
        "export_url": "https://prism.moz.wfp.org/export?date={date}",
    }

    with pytest.raises(ValidationError, match="layer_id"):
        MapExportSchedule.model_validate(payload)
