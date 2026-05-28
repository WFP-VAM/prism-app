"""Tests for schedule layer catalog (build-time manifest parity)."""

import pytest
from prism_app.map_export_layer_catalog import (
    get_deployment_country,
    schedule_layer_choices,
    schedule_layer_ids,
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
