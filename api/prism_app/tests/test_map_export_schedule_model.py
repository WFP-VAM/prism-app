"""Schedule model validation for scheduled batch maps."""

from __future__ import annotations

import pytest
from prism_app.database.map_export_schedule_model import MapExportSchedule
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


def test_schedule_export_url_requires_date_and_layer_placeholders() -> None:
    payload = {
        **_schedule_payload(),
        "export_url": "https://prism.moz.wfp.org/export?date={date}",
    }

    with pytest.raises(ValidationError, match="layer_id"):
        MapExportSchedule.model_validate(payload)
