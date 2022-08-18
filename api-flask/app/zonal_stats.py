"""Calulate zonal statistics and return a json or a geojson."""
import logging
from collections import defaultdict
from datetime import datetime
from enum import Enum
from json import dump, load
from typing import Any
from urllib.parse import urlencode

import rasterio  # type: ignore
from fastapi import HTTPException
from rasterstats import zonal_stats  # type: ignore
from shapely.geometry import mapping, shape  # type: ignore
from shapely.ops import cascaded_union  # type: ignore

from app.caching import FilePath, cache_file, get_json_file
from app.timer import timed

logger = logging.getLogger(__name__)


DEFAULT_STATS = ["min", "max", "mean", "median"]


class GroupBy(str, Enum):
    """Possible values for group_by arguments"""

    ADM0_PCODE = "ADM0_PCODE"
    ADM1_PCODE = "ADM1_PCODE"
    ADM2_PCODE = "ADM2_PCODE"
    TS_PCODE = "TS_PCODE"


def get_wfs_response(wfs_params: dict[str, str]) -> dict:
    """
    Execute Web Feature Service (WFS) request to external OGC server.

    This request returns geospatial features that match required filters within cql_filter param.

    https://docs.geoserver.org/stable/en/user/services/wfs/reference.html
    """
    cql_filter = []
    if "time" in wfs_params.keys():
        from_date = datetime.strptime(wfs_params.get("time", ""), "%Y-%m-%d")
        cql_filter.append("timestamp DURING {}/P1D".format(from_date.isoformat()))

    params = {
        "service": "WFS",
        "version": "1.0.0",
        "request": "GetFeature",
        "typeName": wfs_params.get("layer_name"),
        "outputFormat": "application/json",
    }

    if len(cql_filter) > 0:
        params["cql_filter"] = " AND ".join(cql_filter)

    wfs_url = "{url}?{params}".format(
        url=wfs_params.get("url"), params=urlencode(params)
    )

    wfs_response_path = cache_file(url=wfs_url, prefix="wfs")

    return dict(filter_property_key=wfs_params["key"], path=wfs_response_path)


def _extract_features_properties(zones) -> list:
    with open(zones) as json_file:
        zones = load(json_file)
    return [f["properties"] for f in zones.get("features", [])]


def _group_zones(zones: str, group_by: GroupBy) -> FilePath:
    """Group zones by a key id and merge polygons."""
    with open(zones) as json_file:
        geojson_data = load(json_file)

    features = geojson_data.get("features", [])

    grouped_polygons = defaultdict(list)

    for zone_feature in features:
        grouped_polygons[zone_feature["properties"][group_by]].append(
            shape(zone_feature["geometry"])
        )

    new_features = []
    for group_id, polygons in grouped_polygons.items():
        new_geometry = mapping(cascaded_union(polygons))

        new_features.append(
            dict(
                type="Feature",
                id=group_id,
                properties=dict([(group_by, group_id)]),
                geometry=dict(
                    type=new_geometry["type"], coordinates=new_geometry["coordinates"]
                ),
            )
        )

    outjson = dict(type="FeatureCollection", features=new_features)

    output_file = "{zones}.{group_by}".format(zones=zones, group_by=group_by)

    with open(output_file, "w") as outfile:
        dump(outjson, outfile)

    return FilePath(output_file)


def _create_shapely_geoms(
    geojson_dict: dict, filter_property_key: str
) -> list[tuple[str, Any]]:
    """
    Read and parse geojson dictionary geometries into shapely objects.

    returns a list of tuples with the property value that matches filter_property_key and shapely object.
    """
    shapely_dicts = []
    for f in geojson_dict.get("features"):  # type: ignore
        if f.get("geometry").get("type") not in ["MultiPolygon", "Polygon"]:
            continue

        obj_key = f["properties"][filter_property_key]

        shapely_dicts.append((obj_key, shape(f.get("geometry"))))

    return shapely_dicts


def _get_intersected_polygons(
    zones_geojson, wfs_geojson: dict, filter_property_key: str
) -> list[dict]:
    """
    Generate polygon intersection between each zone and polygons from wfs response.

    This function returns an array of dictionaries

    - 'geom' key contains the shapely object which is used for statistics
    - 'feature' key is a geojson feature with the intersected geometry

    """
    wfs_shapes = _create_shapely_geoms(wfs_geojson, filter_property_key)

    intersected_zones = []
    for zone in zones_geojson.get("features"):
        # Shapely object from zone geojson geometry.
        geom = shape(zone.get("geometry"))

        # Get geometry intersection between zone and wfs response polygons.
        filtered = [
            (k, geom.intersection(s)) for k, s in wfs_shapes if geom.intersects(s)
        ]

        if len(filtered) == 0:
            continue

        filtered_dict = []

        for k, geom in filtered:
            properties = zone.get("properties").copy()

            # Include property value from wfs_response.
            properties[filter_property_key] = k

            # Create geojson feature.
            feature = {
                "type": "Feature",
                "geometry": mapping(geom),
                "properties": properties,
            }

            filtered_dict.append({"geom": geom, "feature": feature})

        intersected_zones.append(filtered_dict)

    # Flatten.
    flattened_intersected_zones = [
        item for sublist in intersected_zones for item in sublist
    ]

    return flattened_intersected_zones


@timed
def calculate_stats(
    zones,
    geotiff,
    group_by: GroupBy | None = None,
    stats=None,
    prefix="stats_",
    geojson_out=False,
    wfs_response=None,
    intersect_comparison=None,
) -> list[dict[str, Any]]:
    """Calculate stats."""
    if group_by:
        zones = _group_zones(zones, group_by)

    stats_input = zones
    if wfs_response:
        zones_geojson = get_json_file(zones)
        wfs_geojson = get_json_file(wfs_response.get("path"))

        zones = _get_intersected_polygons(
            zones_geojson, wfs_geojson, wfs_response.get("filter_property_key")
        )

        # Extract shapely objects to compute stats.
        stats_input = [s.get("geom") for s in zones]
        prefix = None

    # Add function to calculate overlap percentage.
    add_stats = None
    if intersect_comparison is not None:

        def intersect_percentage(masked) -> float:
            # Get total number of elements in the boundary.
            intersect_operator, intersect_baseline = intersect_comparison
            total = masked.count()
            # Avoid dividing by 0
            if total == 0:
                return 0
            percentage = (intersect_operator(masked, intersect_baseline)).sum()
            return percentage / total

        add_stats = {
            "intersect_percentage": intersect_percentage,
        }

    if stats is None:
        stats = DEFAULT_STATS
    try:
        stats_results = zonal_stats(
            stats_input,
            geotiff,
            stats=stats,
            prefix=prefix,
            geojson_out=geojson_out,
            add_stats=add_stats,
        )

    except rasterio.errors.RasterioError as error:
        logger.error(error)
        raise HTTPException(
            status_code=500, detail="An error occured calculating statistics."
        )

    if wfs_response:
        zones_features = [z.get("feature") for z in zones]

        # Add statistics as feature property fields.
        features = [
            {**z, "properties": {**z.get("properties"), **s}}
            for z, s in zip(zones_features, stats_results)
        ]

        # Return stats as geojson array of features.
        return features

    if not geojson_out:
        feature_properties = _extract_features_properties(zones)
        stats_results = [
            {**properties, **stat}
            for stat, properties in zip(stats_results, feature_properties)
        ]
    return stats_results
