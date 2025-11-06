"""Calulate zonal statistics and return a json or a geojson."""

import logging
import os
import re
from collections import defaultdict
from datetime import datetime
from json import dump, load
from typing import Any, NewType, Optional
from urllib.parse import urlencode

import rasterio  # type: ignore
from fastapi import HTTPException
from prism_app.caching import (
    CACHE_DIRECTORY,
    _hash_value,
    cache_file,
    get_json_file,
    is_file_valid,
)
from prism_app.duckdb_utils import setup_duckdb_connection
from prism_app.models import (
    FilePath,
    GeoJSON,
    GeoJSONFeature,
    GroupBy,
    WfsParamsModel,
    WfsResponse,
)
from prism_app.raster_utils import calculate_pixel_area, gdal_calc, reproj_match
from prism_app.timer import timed
from prism_app.validation import VALID_OPERATORS
from rasterio.warp import Resampling
from rasterstats import zonal_stats  # type: ignore
from shapely.errors import GEOSException  # type: ignore
from shapely.geometry import mapping, shape  # type: ignore
from shapely.ops import unary_union  # type: ignore

logger = logging.getLogger(__name__)

DEFAULT_STATS = ["min", "max", "mean", "median", "sum", "std", "count", "nodata"]

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


def _read_zones(
    zones_filepath: FilePath,
    admin_level: Optional[int] = None,
    bbox: Optional[tuple[float, float, float, float]] = None,
    simplify_tolerance: Optional[float] = None,
) -> GeoJSON:
    """
    Read the zones file from either a local GeoJSON or an S3-hosted (or local) GeoParquet,
    optionally filtering by the given bounding box to limit memory usage.

    Parameters
    ----------
    zones_filepath : FilePath
        Path or S3 URI of the zones file. Can be .geojson or .parquet
    bbox : tuple[float, float, float, float], optional
        (minx, miny, maxx, maxy) in the same CRS as the zones data,
        used to limit what is read from the parquet dataset.
    simplify_tolerance : float, optional
        Tolerance value for geometry simplification. Only used for
        parquet files. If None, no simplification is applied.

    Returns
    -------
    dict
        A GeoJSON-style dictionary: {"type": "FeatureCollection", "features": [...]}
    """
    # Check if filepath contains .json or .geojson (case insensitive)
    filepath_lower = zones_filepath.lower()
    if ".parquet" in filepath_lower:
        con = setup_duckdb_connection()
        # Create a temporary view for the filtered data
        view_name = "filtered_zones"
        query = f"CREATE VIEW {view_name} AS SELECT *"
        if simplify_tolerance is not None:
            query += f" exclude(geometry), ST_Simplify(geometry, {simplify_tolerance}) AS geometry"
        query += f" FROM read_parquet('{zones_filepath}')"
        if admin_level is not None:
            query += f" WHERE admin_level = {admin_level}"
        if bbox is not None:
            minx, miny, maxx, maxy = bbox
            query += f" AND ST_Contains(ST_MakeEnvelope({minx}, {miny}, {maxx}, {maxy}), geometry)"
        con.execute(query)
        # Export to temp GeoJSON using GDAL extension
        temp_geojson = os.path.join(CACHE_DIRECTORY, "temp_zones.geojson")
        con.sql(
            f"""
            COPY {view_name} TO '{temp_geojson}'
            WITH (FORMAT GDAL, DRIVER 'GeoJSON', LAYER_CREATION_OPTIONS 'WRITE_BBOX=YES')
            """
        )

        with open(temp_geojson, "r") as f:
            geojson_data = load(f)

        con.close()
        os.remove(temp_geojson)
        return geojson_data

    else:
        # Handle JSON or cache files
        with open(zones_filepath, "r") as f:
            return load(f)


def _extract_features_properties(
    zones_filename: FilePath,
    admin_level: Optional[int] = None,
    simplify_tolerance: Optional[float] = None,
) -> list:
    zones = _read_zones(
        zones_filename, admin_level=admin_level, simplify_tolerance=simplify_tolerance
    )
    return [f["properties"] for f in zones.get("features", [])]


def _group_zones(
    zones_filepath: FilePath,
    group_by: GroupBy,
    admin_level: Optional[int] = None,
    simplify_tolerance: Optional[float] = None,
) -> FilePath:
    """Group zones by a key id and merge polygons."""
    safe_filename = zones_filepath.replace("/", "_").replace("s3://", "")
    cache_filename = safe_filename.replace("parquet", "json")
    output_filename: FilePath = "{zones}.{simplify_tolerance}.{group_by}".format(
        zones=cache_filename, group_by=group_by, simplify_tolerance=simplify_tolerance
    )
    if is_file_valid(output_filename):
        return output_filename

    geojson_data = _read_zones(
        zones_filepath, admin_level=admin_level, simplify_tolerance=simplify_tolerance
    )

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
        except (ValueError, GEOSException) as error:
            logger.error(error)
            logger.error(polygons)
            new_geometry = {}

        if "coordinates" not in new_geometry:
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

    geojson_data = _read_zones(zones_filepath)

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


def _extract_layer_identifier(filepath: FilePath, max_length: int = 100) -> str:
    """Extract a readable layer identifier from a cached raster filepath."""
    filename = os.path.basename(filepath).replace("raster_", "").replace(".tif", "")
    url_replacements = {
        "https___prism-stac-geotiff_s3_amazonaws_com_": "stac_s3_",
        "https___api_earthobservation_vam_wfp_org_ows__": "vam_ows_",
    }

    for old_prefix, new_prefix in url_replacements.items():
        filename = filename.replace(old_prefix, new_prefix)

    # Try to extract meaningful layer name patterns - only keep alphabetic words connected by underscores
    if "stac_s3_" in filename:
        # Extract only alphabetic layer name (letters and underscores only), keep stac_s3_ prefix
        match = re.search(r"(stac_s3_[a-z]+(?:_[a-z]+)*)", filename)
        if match:
            return match.group(1)[:max_length]

    # For VAM OWS: extract coverage name like hf_water_khm - only keep alphabetic words connected by underscores
    if "vam_ows_" in filename:
        # Extract only alphabetic layer name after coverage_, keep vam_ows_ prefix
        match = re.search(r"coverage_(vam_ows_[a-z]+(?:_[a-z]+)*)", filename)
        if match:
            return match.group(1)[:max_length]
        # If no match with vam_ows_ in coverage, try extracting and prepending
        match = re.search(r"coverage_([a-z]+(?:_[a-z]+)*)", filename)
        if match:
            return f"vam_ows_{match.group(1)}"[:max_length]

    # Fallback
    return filename[:max_length]


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
    admin_level: Optional[int] = None,
    simplify_tolerance: Optional[float] = None,
) -> list[dict[str, Any]]:
    """Calculate stats."""

    # Add mask option for flood exposure analysis
    if mask_geotiff:
        # Extract readable layer identifiers
        geotiff_layer = _extract_layer_identifier(geotiff)
        mask_layer = _extract_layer_identifier(mask_geotiff)

        # Combine all inputs to create a unique cache key
        cache_key = f"{geotiff}_{mask_geotiff}_{mask_calc_expr or 'no_calc'}"
        cache_hash = _hash_value(cache_key)

        slugified_calc = "no_calc"
        if mask_calc_expr is not None:
            slugified_calc = mask_calc_expr
            for symbol, operator in VALID_OPERATORS.items():
                slugified_calc = slugified_calc.replace(symbol, operator.__name__)

            # Limit to 20 chars to prevent long filenames
            slugified_calc = "".join(
                [x if x.isalnum() else "" for x in (slugified_calc)]
            )[:20]

        masked_pop_geotiff: FilePath = (
            f"{CACHE_DIRECTORY}raster_masked_{geotiff_layer}_{slugified_calc}_{cache_hash}.tif"
        )

        if not is_file_valid(masked_pop_geotiff):
            # tentatively remove the reprojection step now that we are consolidating our requests
            # through STAC and receive actual image files.
            try:
                gdal_calc(
                    input_file_path=geotiff,
                    mask_file_path=mask_geotiff,
                    output_file_path=masked_pop_geotiff,
                    calc_expr=mask_calc_expr,
                )
            # catch errors in gdal_calc, try a reproj
            except Exception:
                logger.warning(
                    "gdal_calc failed, trying to reproject geotiff and retry..."
                )
                reproj_cache_key = f"{geotiff}_reproj_on_{mask_geotiff}"
                reproj_hash = _hash_value(reproj_cache_key)
                reproj_pop_geotiff: FilePath = (
                    f"{CACHE_DIRECTORY}raster_reproj_{geotiff_layer}_on_{mask_layer}_{reproj_hash}.tif"
                )
                if not is_file_valid(reproj_pop_geotiff):
                    reproj_match(
                        geotiff,
                        mask_geotiff,
                        reproj_pop_geotiff,
                        resampling_mode=Resampling.sum,
                    )
                gdal_calc(
                    input_file_path=reproj_pop_geotiff,
                    mask_file_path=mask_geotiff,
                    output_file_path=masked_pop_geotiff,
                    calc_expr=mask_calc_expr,
                )

        geotiff = masked_pop_geotiff

    if group_by:
        zones_filepath = _group_zones(
            zones_filepath, group_by, admin_level, simplify_tolerance
        )

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
        # preload the file contents for fiona 1.10.1 as it does not seem happy
        # with a file path anymore: https://github.com/Toblerity/Fiona/issues/1455
        with open(stats_input, "r") as stats_input_fp:
            stats_input_str = stats_input_fp.read()

            stats_results = zonal_stats(
                stats_input_str,
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
        feature_properties = _extract_features_properties(
            zones_filepath, admin_level, simplify_tolerance
        )

        if filter_by is not None:
            key, value = filter_by
            feature_properties = [p for p in feature_properties if str(p[key]) == value]

        stats_results = [
            {**properties, **stat}
            for stat, properties in zip(stats_results, feature_properties)
        ]
    return stats_results
