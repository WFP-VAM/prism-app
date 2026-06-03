"""Unit tests for WMS/WCS capability date parsing (alert-worker parity)."""

from __future__ import annotations

from prism_app.workers.scheduled_public_maps.layer_days import (
    collect_times_for_layer_id,
    parse_wms_capabilities_layer_days,
)


def test_parse_wms_dimension_time() -> None:
    xml = """<?xml version="1.0"?>
    <WMS_Capabilities>
      <Capability>
        <Layer>
          <Layer>
            <Name>prism:precip_blended_dekad</Name>
            <Dimension name="time" units="ISO8601">2026-04-01,2026-04-21</Dimension>
          </Layer>
        </Layer>
      </Capability>
    </WMS_Capabilities>
    """
    m = parse_wms_capabilities_layer_days(xml)
    times = collect_times_for_layer_id(m, "precip_blended_dekad")
    assert len(times) == 2
    assert max(times) >= min(times)


def test_collect_times_fuzzy_layer_id() -> None:
    m = {"moz:precip_blended_dekad": [1, 2, 3]}
    assert collect_times_for_layer_id(m, "precip_blended_dekad") == [1, 2, 3]
