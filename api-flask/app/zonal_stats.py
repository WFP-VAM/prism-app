"""Calulate zonal statistics and return a json or a geojson."""
import logging
from collections import defaultdict
from datetime import datetime
from json import dump, load
from urllib.parse import urlencode

import rasterio
import numpy as np
from app.caching import cache_file, get_json_file
from app.timer import timed
from app.raster_utils import gdal_calc, reproj_match
from rasterstats import zonal_stats
from rasterio.warp import Resampling
from shapely.geometry import mapping, shape
from shapely.ops import cascaded_union
from werkzeug.exceptions import InternalServerError

logger = logging.getLogger(__name__)


DEFAULT_STATS = ["min", "max", "mean", "median"]


def get_wfs_response(wfs_params):
    """
    Execute Web Feature Service (WFS) request to external OGC server.

    This request returns geospatial features that match required filters within cql_filter param.

    https://docs.geoserver.org/stable/en/user/services/wfs/reference.html
    """
    cql_filter = []
    if "time" in wfs_params.keys():
        from_date = datetime.strptime(wfs_params.get("time"), "%Y-%m-%d")
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


def _extract_features_properties(zones):
    with open(zones) as json_file:
        zones = load(json_file)
    return [f["properties"] for f in zones.get("features", [])]


def _group_zones(zones, group_by):
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

    return output_file


def _create_shapely_geoms(geojson_dict, filter_property_key):
    """
    Read and parse geojson dictionary geometries into shapely objects.

    returns a tuple with the property value that matches filter_property_key and shapely object.
    """
    shapely_dicts = []
    for f in geojson_dict.get("features"):
        if f.get("geometry").get("type") not in ["MultiPolygon", "Polygon"]:
            continue

        obj_key = f["properties"][filter_property_key]

        shapely_dicts.append((obj_key, shape(f.get("geometry"))))

    return shapely_dicts


def _get_intersected_polygons(zones_geojson, wfs_geojson, filter_property_key):
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
    intersected_zones = [item for sublist in intersected_zones for item in sublist]

    return intersected_zones


@timed
def calculate_stats(
    zones,
    geotiff,
    group_by=None,
    stats=None,
    prefix="stats_",
    geojson_out=False,
    wfs_response=None,
    intersect_comparison=None,
    mask_geotiff=None,
):
    """Calculate stats."""

    # Add mask option for flood exposure analysis
    if mask_geotiff:
        reproj_pop_geotiff = geotiff.replace("raster_", "raster_reproj_")
        masked_pop_geotiff = geotiff.replace("raster_", "raster_masked_")

        # TODO - smart caching. Needs to take into account both file names
        reproj_match(
            geotiff, mask_geotiff, reproj_pop_geotiff, resampling_mode=Resampling.sum
        )

        gdal_calc(
            input_file_path=reproj_pop_geotiff,
            mask_file=mask_geotiff,
            output_file_path=masked_pop_geotiff,
            calc_expr='"A*(B==0)"',
        )

        masked_geotiff_r = rasterio.open(masked_pop_geotiff)
        masked_geotiff_array = masked_geotiff_r.read(1)

        for array in [masked_geotiff_array]:
            logger.debug(
                {
                    "min": array.min(),
                    "mean": array.mean(),
                    "median": np.median(array),
                    "max": array.max(),
                }
            )

        geotiff = masked_pop_geotiff

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

    # Add function to calculate overlap percentage.
    add_stats = None
    if intersect_comparison is not None:

        def intersect_percentage(masked):
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
        raise InternalServerError("An error occured calculating statistics.")

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
