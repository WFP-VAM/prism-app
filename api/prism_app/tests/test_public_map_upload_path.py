"""``public_map_upload_path_segments`` (explicit country + URL layer for public_maps)."""

from __future__ import annotations

import pytest
from prism_app.utils import public_map_upload_path_segments


def test_public_map_upload_path_segments_with_country() -> None:
    u = "https://prism.moz.wfp.org/export?date=2025-01-01&hazardLayerIds=precip_a"
    assert public_map_upload_path_segments(u, country="moz") == ("moz", "precip_a")


def test_public_map_upload_path_segments_slugifies_country() -> None:
    u = "http://localhost/?date=2025-01-01&hazardLayerIds=lyr"
    assert public_map_upload_path_segments(u, country="Mozambique") == (
        "mozambique",
        "lyr",
    )


def test_public_map_upload_path_segments_comma_layers() -> None:
    u = "http://localhost/?date=2025-01-01&hazardLayerIds=a,b,c"
    assert public_map_upload_path_segments(u, country="x") == ("x", "a")


def test_public_map_upload_path_segments_requires_country() -> None:
    u = "http://localhost/?date=2025-01-01&hazardLayerIds=lyr"
    with pytest.raises(ValueError, match="explicit country"):
        public_map_upload_path_segments(u)


def test_public_map_upload_path_segments_requires_hazard_layer_ids() -> None:
    with pytest.raises(ValueError, match="hazardLayerIds"):
        public_map_upload_path_segments("http://localhost/?date=2025-01-01", country="c")
