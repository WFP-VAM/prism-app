"""Calulate zonal statistics and return a json or a geojson."""
import logging
from collections import defaultdict
from datetime import datetime
from json import dump, load
from pathlib import Path
from typing import Any, NewType, Optional
from urllib.parse import urlencode

import numpy as np
import rasterio  # type: ignore
from app.caching import CACHE_DIRECTORY, cache_file, get_json_file, is_file_valid
from app.models import (
    FilePath,
    GeoJSON,
    GeoJSONFeature,
    GroupBy,
    WfsParamsModel,
    WfsResponse,
)
from app.raster_utils import calculate_pixel_area, gdal_calc, reproj_match
from app.timer import timed
from app.validation import VALID_OPERATORS
from fastapi import HTTPException
from osgeo import gdal
from rasterio.warp import Resampling
from rasterstats import zonal_stats  # type: ignore
from shapely.geometry import mapping, shape  # type: ignore
from shapely.ops import unary_union  # type: ignore

logger = logging.getLogger(__name__)


DEFAULT_STATS = ["min", "max", "mean", "median", "sum", "std", "nodata", "count"]

AreaInSqKm = NewType("AreaInSqKm", float)
Percentage = NewType("Percentage", float)


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
        try:
            new_geometry = mapping(unary_union(polygons))
        except ValueError as error:
            logger.error(error)
            logger.error(polygons)
            new_geometry = {}

        if not "coordinates" in new_geometry:
            logger.error(
                "Grouping of polygons %s returned an empty geometry for file %s.",
                group_id,
                output_filename,
            )
            logger.error(new_geometry)
            continue

        new_features.append(
            dict(
                type="Feature",
                id=group_id,
                properties=dict([(group_by, group_id)]),
                geometry=dict(
                    type=new_geometry["type"],
                    coordinates=new_geometry["coordinates"],
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

        # Excluding 'Uncertainty Cones' from storm analysis.
        if obj_key == "Uncertainty Cones":
            continue

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


def get_filtered_features(zones_filepath: FilePath, key: str, value: str) -> FilePath:
    """Creates a geojson file with features matching properties key and value"""
    output_filename = FilePath(
        "{zones}.{key}.{value}".format(zones=zones_filepath, key=key, value=value)
    )

    with open(zones_filepath) as json_file:
        geojson_data = load(json_file)

    filtered_features: list[GeoJSONFeature] = [
        f
        for f in geojson_data["features"]
        if key in f["properties"].keys() and str(f["properties"][key]) == value
    ]

    if len(filtered_features) == 0:
        message = f"Property '{key}' = '{value}' not found"
        logger.info(message)
        raise HTTPException(status_code=404, detail=message)

    features_filtered = {**geojson_data, "features": filtered_features}
    with open(output_filename, "w") as outfile:
        dump(features_filtered, outfile)

    return output_filename


def get_intersected_wfs_polygons(
    wfs_response: WfsResponse, zones_filepath: FilePath
) -> FilePath:
    """Returns the filepath of the intersected wfs featurecollection and boundaries (zones) file."""
    zones_geojson: GeoJSON = get_json_file(zones_filepath)
    wfs_geojson: GeoJSON = get_json_file(wfs_response["path"])

    intersected_polygons = _get_intersected_polygons(
        zones_geojson, wfs_geojson, wfs_response["filter_property_key"]
    )

    intersected_polygon_features = {
        "type": "FeatureCollection",
        "features": [f.get("feature") for f in intersected_polygons],
    }

    output_filename = FilePath("{zones}.intersection".format(zones=zones_filepath))

    with open(output_filename, "w") as outfile:
        dump(intersected_polygon_features, outfile)

    return output_filename


@timed
def calculate_stats(
    zones_filepath: FilePath,  # list or FilePath??
    geotiff: FilePath,
    group_by: Optional[GroupBy] = None,
    stats: Optional[list[str] | str] = None,
    prefix: Optional[str] = "stats_",
    geojson_out: bool = False,
    wfs_response: Optional[WfsResponse] = None,
    # WARNING - currently, when intersect_comparison is used,
    # regions with 0 overlap are excluded from the results.
    intersect_comparison: Optional[tuple] = None,
    mask_geotiff: Optional[str] = None,
    mask_calc_expr: Optional[str] = None,
    filter_by: Optional[tuple[str, str]] = None,
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

        # Slugify the calc expression into a reasonable filename
        slugified_calc = "default"
        if mask_calc_expr is not None:
            slugified_calc = mask_calc_expr
            for symbol, operator in VALID_OPERATORS.items():
                slugified_calc = slugified_calc.replace(symbol, operator.__name__)

            slugified_calc = "".join(
                [x if x.isalnum() else "" for x in (slugified_calc)]
            )

        masked_pop_geotiff: FilePath = f"{CACHE_DIRECTORY}raster_reproj_{geotiff_hash}_masked_by_{mask_hash}_{slugified_calc}.tif"

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
                calc_expr=mask_calc_expr,
            )

        geotiff = masked_pop_geotiff

    if group_by:
        zones_filepath = _group_zones(zones_filepath, group_by)

    stats_input = (
        zones_filepath
        if filter_by is None
        else get_filtered_features(zones_filepath, filter_by[0], filter_by[1])
    )

    if wfs_response is not None:
        stats_input = get_intersected_wfs_polygons(wfs_response, zones_filepath)
        # TODO - remove this prefix to make homogeneize stats output
        # Frontend from this PR (546) needs to be deployed first.
        prefix = None

    # Add function to calculate overlap percentage.
    add_stats = None
    if intersect_comparison is not None:
        pixel_area = calculate_pixel_area(geotiff)

        def intersect_pixels(masked) -> float:
            # Get total number of elements matching our operator in the boundary.
            intersect_operator, intersect_baseline = intersect_comparison  # type: ignore
            # If total is 0, no need to count. This avoids returning NaN.
            total = masked.count()
            if total == 0:
                return 0.0
            return float((intersect_operator(masked, intersect_baseline)).sum())

        def intersect_area(masked) -> AreaInSqKm:
            # Area in sq km per pixel value
            return AreaInSqKm(intersect_pixels(masked) * pixel_area)

        add_stats = {
            "intersect_pixels": intersect_pixels,
            "intersect_area": intersect_area,
        }

    try:
        stats_results = zonal_stats(
            stats_input,
            geotiff,
            stats=stats if stats is not None else DEFAULT_STATS,
            prefix=prefix,
            geojson_out=geojson_out,
            add_stats=add_stats,
        )

    except rasterio.errors.RasterioError as error:
        logger.error(error)
        raise HTTPException(
            status_code=500, detail="An error occured calculating statistics."
        ) from error
    # This Exception is raised by rasterstats library when feature collection as 0 elements within the feature array.
    except ValueError:
        stats_results = []

    # cleanup data and remove nan values
    # add intersect stats if requested
    clean_results = []
    for result in stats_results:
        stats_properties: dict = result if not geojson_out else result["properties"]

        # clean results
        clean_stats_properties = {
            k: 0 if str(v).lower() == "nan" else v for k, v in stats_properties.items()
        }

        # calculate intersect_percentage
        if intersect_comparison is not None:
            safe_prefix = prefix or ""
            total = (
                float(clean_stats_properties[f"{safe_prefix}count"])
                + clean_stats_properties[f"{safe_prefix}nodata"]
            )
            if total == 0:
                intersect_percentage = Percentage(0.0)
            else:
                intersect_percentage = Percentage(
                    clean_stats_properties[f"{safe_prefix}intersect_pixels"] / total
                )

            clean_stats_properties = {
                **clean_stats_properties,
                f"{safe_prefix}intersect_percentage": intersect_percentage,
            }

        # merge properties back at the proper level
        # and filter out properties that have "no" intersection
        # by setting a limit at 0.005 (0.5%).
        if intersect_comparison is not None and intersect_percentage < 0.005:
            continue
        if not geojson_out:
            clean_results.append(clean_stats_properties)
        else:
            clean_results.append({**result, "properties": clean_stats_properties})

    stats_results = clean_results

    if not geojson_out:
        feature_properties = _extract_features_properties(zones_filepath)

        if filter_by is not None:
            key, value = filter_by
            feature_properties = [p for p in feature_properties if str(p[key]) == value]

        stats_results = [
            {**properties, **stat}
            for stat, properties in zip(stats_results, feature_properties)
        ]
    return stats_results
