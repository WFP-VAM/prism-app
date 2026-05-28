"""Layer choices for scheduled map exports (build-time manifest from frontend config)."""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

_MANIFEST_PATH = (
    Path(__file__).resolve().parent / "data" / "schedule_layer_manifest.json"
)


def get_deployment_country() -> str:
    """Single deployment country slug (same convention as ``REACT_APP_COUNTRY``)."""
    for key in ("PRISM_DEPLOYMENT_COUNTRY", "REACT_APP_COUNTRY"):
        value = os.getenv(key, "").strip().lower()
        if value:
            return value
    return "mozambique"


@lru_cache(maxsize=1)
def _load_manifest() -> dict[str, Any]:
    if not _MANIFEST_PATH.is_file():
        raise FileNotFoundError(
            "Schedule layer manifest not found. Run "
            "`cd frontend && yarn generate-schedule-layer-manifest`."
        )
    return json.loads(_MANIFEST_PATH.read_text(encoding="utf-8"))


def _country_layers(country: str) -> list[dict[str, str]]:
    countries = _load_manifest().get("countries", {})
    if country not in countries:
        raise FileNotFoundError(
            f"Unknown deployment country in schedule layer manifest: {country}"
        )
    return countries[country]


@lru_cache(maxsize=16)
def schedule_layer_choices(country: str) -> tuple[tuple[str, str], ...]:
    choices: list[tuple[str, str]] = []
    for entry in _country_layers(country):
        layer_id = entry["id"]
        title = entry.get("title") or layer_id
        choices.append((layer_id, f"{layer_id} — {title}"))
    return tuple(choices)


def schedule_layer_ids(country: str | None = None) -> frozenset[str]:
    slug = country or get_deployment_country()
    return frozenset(layer_id for layer_id, _ in schedule_layer_choices(slug))
