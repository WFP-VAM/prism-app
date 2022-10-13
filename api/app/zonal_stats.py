"""Calulate zonal statistics and return a json or a geojson."""
import logging
from collections import defaultdict
from datetime import datetime
from json import dump, load
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import numpy as np
import rasterio  # type: ignore
from fastapi import HTTPException
from rasterio.warp import Resampling
from rasterstats import zonal_stats  # type: ignore
from shapely.geometry import mapping, shape  # type: ignore
from shapely.ops import unary_union  # type: ignore

from app.caching import (CACHE_DIRECTORY, cache_file, get_json_file,
                         is_file_valid)
from app.models import (FilePath, GeoJSON, GeoJSONFeature, GroupBy,
                        WfsParamsModel, WfsResponse)
from app.raster_utils import gdal_calc, reproj_match
from app.timer import timed

logger = logging.getLogger(__name__)


DEFAULT_STATS = ["min", "max", "mean", "median"]


def get_wfs_response(wfs_params: WfsParamsModel) -> WfsResponse:
    """
    Execute Web Feature Service (WFS) request to external OGC server.

    This request returns geospatial features that match required filters within cql_filter param.

    https://docs.geoserver.org/stable/en/user/services/wfs/reference.html
    """
    cql_filter = []
    if wfs_params.time is not None:
        from_date = datetime.strptime(wfs_params.time, "%Y-%m-%d")
        cql_filter.append("timestamp DURING {}/P1D".format(from_date.isoformat()))

    params = {
        "service": "WFS",
        "version": "1.0.0",
        "request": "GetFeature",
        "typeName": wfs_params.layer_name,
        "outputFormat": "application/json",
    }

    if len(cql_filter) > 0:
        params["cql_filter"] = " AND ".join(cql_filter)

    wfs_url = f"{wfs_params.url}?{urlencode(params)}"

    wfs_response_path = cache_file(url=wfs_url, prefix="wfs")

    return WfsResponse(filter_property_key=wfs_params.key, path=wfs_response_path)


def _extract_features_properties(zones_filename: FilePath) -> list:
    with open(zones_filename) as json_file:
        zones = load(json_file)
    return [f["properties"] for f in zones.get("features", [])]


def _group_zones(zones_filepath: FilePath, group_by: GroupBy) -> FilePath:
    """Group zones by a key id and merge polygons."""
    output_filename: FilePath = "{zones}.{group_by}".format(
        zones=zones_filepath, group_by=group_by
    )
    if is_file_valid(output_filename):
        return output_filename

    with open(zones_filepath) as json_file:
        geojson_data = load(json_file)

    features = geojson_data.get("features", [])

    grouped_polygons = defaultdict(list)

    for zone_feature in features:
        grouped_polygons[zone_feature["properties"][group_by]].append(
            shape(zone_feature["geometry"])
        )

    new_features = []
    for group_id, polygons in grouped_polygons.items():
        new_geometry = mapping(unary_union(polygons))

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

    with open(output_filename, "w") as outfile:
        dump(outjson, outfile)

    return FilePath(output_filename)


def _create_shapely_geoms(
    geojson_dict: GeoJSON, filter_property_key: str
) -> list[tuple[str, Any]]:
    """
    Read and parse geojson dictionary geometries into shapely objects.

    returns a list of tuples with the property value that matches filter_property_key and shapely object.
    """
    shapely_dicts = []
    for f in geojson_dict.get("features", []):
        if f.get("geometry", {}).get("type", "") not in ["MultiPolygon", "Polygon"]:
            continue

        obj_key = f["properties"][filter_property_key]

        shapely_dicts.append((obj_key, shape(f.get("geometry"))))

    return shapely_dicts


def _get_intersected_polygons(
    zones_geojson: GeoJSON, wfs_geojson: GeoJSON, filter_property_key: str
) -> list[dict]:
    """
    Generate polygon intersection between each zone and polygons from wfs response.

    This function returns an array of dictionaries

    - 'geom' key contains the shapely object which is used for statistics
    - 'feature' key is a geojson feature with the intersected geometry

    """
    wfs_shapes = _create_shapely_geoms(wfs_geojson, filter_property_key)

    intersected_zones = []
    zone: GeoJSONFeature
    for zone in zones_geojson.get("features", []):
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
            properties = zone.get("properties", {}).copy()

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
    zones_filepath: FilePath,  # list or FilePath??
    geotiff: FilePath,
    group_by: GroupBy | None = None,
    stats: list[str] | str | None = None,
    prefix: str | None = "stats_",
    geojson_out: bool = False,
    wfs_response: WfsResponse | None = None,
    intersect_comparison: tuple | None = None,
    mask_geotiff: str | None = None,
) -> list[dict[str, Any]]:
    """Calculate stats."""

    # Add mask option for flood exposure analysis
    if mask_geotiff:
        # quick hack to create "readable" filenames for caching.
        geotiff_hash = Path(geotiff).name.replace("raster_", "").replace(".tif", "")
        mask_hash = Path(mask_geotiff).name.replace("raster_", "").replace(".tif", "")

        reproj_pop_geotiff: FilePath = (
            f"{CACHE_DIRECTORY}raster_reproj_{geotiff_hash}_on_{mask_hash}.tif"
        )
        masked_pop_geotiff: FilePath = (
            f"{CACHE_DIRECTORY}raster_reproj_{geotiff_hash}_masked_by_{mask_hash}.tif"
        )

        if not is_file_valid(reproj_pop_geotiff):
            reproj_match(
                geotiff,
                mask_geotiff,
                reproj_pop_geotiff,
                resampling_mode=Resampling.sum,
            )

        if not is_file_valid(masked_pop_geotiff):
            gdal_calc(
                input_file_path=reproj_pop_geotiff,
                mask_file_path=mask_geotiff,
                output_file_path=masked_pop_geotiff,
                calc_expr='"A*(B==1)"',
            )

        geotiff = masked_pop_geotiff

    if group_by:
        zones_filepath = _group_zones(zones_filepath, group_by)

    stats_input: FilePath | list = zones_filepath
    zones: list[dict] = []
    if wfs_response:
        zones_geojson = get_json_file(zones_filepath)
        wfs_geojson = get_json_file(wfs_response["path"])

        zones = _get_intersected_polygons(
            zones_geojson, wfs_geojson, wfs_response["filter_property_key"]
        )

        # Extract shapely objects to compute stats.
        stats_input = [s.get("geom") for s in zones]
        # TODO - remove this prefix to make homogeneize stats output
        # Frontend from this PR (546) needs to be deployed first.
        prefix = None

    # Add function to calculate overlap percentage.
    add_stats = None
    if intersect_comparison is not None:

        def intersect_percentage(masked) -> float:
            # Get total number of elements in the boundary.
            intersect_operator, intersect_baseline = intersect_comparison  # type: ignore
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

    if wfs_response is not None:
        zones_features = [z.get("feature") for z in zones]

        # Add statistics as feature property fields.
        features = [
            {**z, "properties": {**z.get("properties", {}), **s}}  # type: ignore
            for z, s in zip(zones_features, stats_results)
        ]

        # Return stats as geojson array of features.
        # TODO - consider the geojson_out flag and format the return object appropriately.
        return features

    if not geojson_out:
        feature_properties = _extract_features_properties(zones_filepath)
        stats_results = [
            {**properties, **stat}
            for stat, properties in zip(stats_results, feature_properties)
        ]
    return stats_results
