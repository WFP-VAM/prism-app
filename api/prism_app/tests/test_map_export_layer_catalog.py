"""Tests for schedule layer catalog (build-time manifest parity)."""

import pytest
from prism_app.map_export_layer_catalog import (
    get_deployment_country,
    schedule_layer_choices,
    schedule_layer_ids,
    schedule_layer_label,
    schedule_layer_choices_with_extra,
)


def test_mozambique_schedule_layers_include_wms_with_coverage() -> None:
    ids = schedule_layer_ids("mozambique")
    assert "precip_blended_dekad" in ids


def test_boundary_layers_are_not_schedule_eligible() -> None:
    ids = schedule_layer_ids("mozambique")
    assert "admin_boundaries" not in ids


def test_schedule_layer_choices_sorted_and_non_empty() -> None:
    choices = schedule_layer_choices("mozambique")
    assert len(choices) > 0
    ids = [layer_id for layer_id, _ in choices]
    assert ids == sorted(ids)
    assert "precip_blended_dekad" in schedule_layer_ids("mozambique")


def test_unknown_country_raises() -> None:
    with pytest.raises(FileNotFoundError, match="Unknown deployment country"):
        schedule_layer_choices("not-a-real-country")


def test_get_deployment_country_defaults_to_mozambique(monkeypatch) -> None:
    monkeypatch.delenv("PRISM_DEPLOYMENT_COUNTRY", raising=False)
    monkeypatch.delenv("REACT_APP_COUNTRY", raising=False)
    assert get_deployment_country() == "mozambique"


def test_cambodia_schedule_layers_include_rain_anomaly() -> None:
    ids = schedule_layer_ids("cambodia")
    assert "rain_anomaly_6month" in ids


def test_schedule_layer_label_falls_back_for_unknown_id() -> None:
    assert schedule_layer_label("mozambique", "not_in_manifest_xyz") == "not_in_manifest_xyz"


def test_schedule_layer_choices_with_extra_includes_legacy_id() -> None:
    choices = schedule_layer_choices_with_extra(
        "mozambique",
        extra_layer_ids=("legacy_layer_xyz",),
    )
    assert ("legacy_layer_xyz", "legacy_layer_xyz") in choices


def test_schedule_layer_label_uses_country_manifest() -> None:
    label = schedule_layer_label("cambodia", "rain_anomaly_6month")
    assert "rain_anomaly_6month" in label
    assert "6-month" in label.lower() or "rainfall" in label.lower()
