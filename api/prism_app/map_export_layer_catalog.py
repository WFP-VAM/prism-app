"""Layer choices for scheduled map exports (mirrors PRISM batch-print eligibility)."""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

_CONFIG_ROOT_ENV = "PRISM_LAYER_CONFIG_ROOT"


def _resolve_config_root() -> Path:
    """Locate ``frontend/src/config`` (repo checkout or ``PRISM_LAYER_CONFIG_ROOT``)."""
    override = os.getenv(_CONFIG_ROOT_ENV, "").strip()
    if override:
        root = Path(override).resolve()
        if not root.is_dir():
            raise FileNotFoundError(f"{_CONFIG_ROOT_ENV} is not a directory: {root}")
        return root

    here = Path(__file__).resolve().parent
    for base in (here, *here.parents):
        candidate = base / "frontend" / "src" / "config"
        if candidate.is_dir() and any(candidate.glob("*/layers.json")):
            return candidate

    raise FileNotFoundError(
        f"Could not locate frontend layer config. Set {_CONFIG_ROOT_ENV} "
        "(e.g. mount frontend/src/config in the API container)."
    )


_CONFIG_ROOT = _resolve_config_root()


def get_deployment_country() -> str:
    """Single deployment country slug (same convention as ``REACT_APP_COUNTRY``)."""
    for key in ("PRISM_DEPLOYMENT_COUNTRY", "REACT_APP_COUNTRY"):
        value = os.getenv(key, "").strip().lower()
        if value:
            return value
    return "mozambique"


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def merged_country_layers(country: str) -> dict[str, dict[str, Any]]:
    """Merge shared + country layers; country keys win (see ``getRawLayers``)."""
    country_path = _CONFIG_ROOT / country / "layers.json"
    if not country_path.is_file():
        raise FileNotFoundError(
            f"Unknown deployment country layer config: {country_path}"
        )
    shared_path = _CONFIG_ROOT / "shared" / "layers.json"
    country_layers = _load_json(country_path)
    shared_layers = _load_json(shared_path) if shared_path.is_file() else {}
    merged = {**shared_layers, **country_layers}
    return {
        layer_id: merged[layer_id] for layer_id in country_layers if layer_id in merged
    }


def is_schedule_eligible_layer(layer: dict[str, Any]) -> bool:
    """WMS layers with static date coverage (``isWmsSelectableForBatchPrint`` without server dates)."""
    if layer.get("type") != "wms":
        return False
    return bool(layer.get("coverageWindow") or layer.get("validity"))


@lru_cache(maxsize=16)
def schedule_layer_choices(country: str) -> tuple[tuple[str, str], ...]:
    choices: list[tuple[str, str]] = []
    for layer_id, layer in sorted(merged_country_layers(country).items()):
        if not is_schedule_eligible_layer(layer):
            continue
        title = layer.get("title") or layer_id
        choices.append((layer_id, f"{layer_id} — {title}"))
    return tuple(choices)


def schedule_layer_ids(country: str | None = None) -> frozenset[str]:
    slug = country or get_deployment_country()
    return frozenset(layer_id for layer_id, _ in schedule_layer_choices(slug))
