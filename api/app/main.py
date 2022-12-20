"""FastAPI API for geospatial utils."""

import functools
import json
import logging
from typing import Any, Optional
from urllib.parse import ParseResult, urlencode, urlunparse

import rasterio  # type: ignore
from app.auth import validate_user
from app.caching import FilePath, cache_file, cache_geojson
from app.database.alert_model import AlertModel
from app.database.database import AlertsDataBase
from app.database.user_info_model import UserInfoModel
from app.kobo import get_form_dates, get_form_responses, parse_datetime_params
from app.models import FilterProperty
from app.timer import timed
from app.validation import validate_intersect_parameter
from app.zonal_stats import GroupBy, calculate_stats, get_wfs_response
from fastapi import Depends, FastAPI, HTTPException, Path, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import EmailStr, HttpUrl

from .models import AlertsModel, StatsModel

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PRISM Geospatial API by WFP",
    description="A geospatial API enabling aggregation and intersection calculations "
    "between rasters and polygons.",
)

cors_origins = [
    "http://localhost:3000",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

alert_db = AlertsDataBase()


@app.get("/")
def healthcheck() -> str:
    """Verify that the server is healthy."""
    return "All good!"


@timed
@functools.lru_cache(maxsize=128)
def _calculate_stats(
    zones_filepath: FilePath,
    geotiff: FilePath,
    stats,
    prefix: str,
    group_by: GroupBy,
    geojson_out,
    # passed as hashable frozenset for caching
    wfs_response: Optional[frozenset],
    intersect_comparison,
    mask_geotiff,
    mask_calc_expr: Optional[str] = None,
    filter_by: Optional[tuple[str, str]] = None,
):
    """Calculate stats."""
    return calculate_stats(
        zones_filepath,
        geotiff,
        stats=stats,
        prefix=prefix,
        group_by=group_by,
        geojson_out=geojson_out,
        wfs_response=dict(wfs_response) if wfs_response is not None else None,
        intersect_comparison=intersect_comparison,
        mask_geotiff=mask_geotiff,
        mask_calc_expr=mask_calc_expr,
        filter_by=filter_by,
    )


@timed
@app.post("/stats", responses={500: {"description": "Internal server error"}})
def stats(stats_model: StatsModel) -> list[dict[str, Any]]:
    """Return zonal statistics."""
    # Accept data as json or form.
    logger.debug("New stats request:")
    logger.debug(stats_model)
    geotiff_url = stats_model.geotiff_url
    zones_url = stats_model.zones_url
    zones_geojson = stats_model.zones
    geojson_out = stats_model.geojson_out
    intersect_comparison_string = stats_model.intersect_comparison
    mask_geotiff_url = stats_model.mask_url
    mask_calc_expr = stats_model.mask_calc_expr

    filter_by = None
    # Tuple transformation fixes unhashable type error caused by timed decorator.
    if stats_model.filter_by is not None:
        filter_by = (stats_model.filter_by.key, str(stats_model.filter_by.value))

    group_by = stats_model.group_by
    wfs_params = stats_model.wfs_params

    geotiff = cache_file(prefix="raster", url=geotiff_url, extension="tif")
    mask_geotiff: FilePath = None
    if mask_geotiff_url:
        mask_geotiff = cache_file(
            prefix="raster", url=mask_geotiff_url, extension="tif"
        )

    zones: FilePath
    if zones_geojson is not None:
        zones = cache_geojson(
            prefix="zones_geojson", geojson=zones_geojson, extension="json"
        )
    else:
        zones = cache_file(
            prefix="zones",
            url=zones_url,
            extension="json",
        )

    wfs_response = None
    if wfs_params is not None:
        wfs_response = get_wfs_response(wfs_params)

    intersect_comparison_tuple = None
    if intersect_comparison_string is not None:
        intersect_comparison_tuple = validate_intersect_parameter(
            intersect_comparison_string
        )

    features = _calculate_stats(
        zones,
        geotiff,
        stats=" ".join(["min", "max", "mean", "median", "sum", "std"]),
        prefix="stats_",
        group_by=group_by,
        geojson_out=geojson_out,
        wfs_response=frozenset(wfs_response.items())
        if wfs_response is not None
        else None,
        intersect_comparison=intersect_comparison_tuple,
        mask_geotiff=mask_geotiff,
        mask_calc_expr=mask_calc_expr,
        filter_by=filter_by,
    )

    return features


@app.get("/kobo/dates")
def get_kobo_form_dates(
    koboUrl: HttpUrl,
    formId: str,
    datetimeField: str,
):
    """Get all form response dates."""
    return get_form_dates(koboUrl, formId, datetimeField)


@app.get("/kobo/forms")
def get_kobo_forms(
    formId: str,
    datetimeField: str,
    koboUrl: HttpUrl,
    geomField: Optional[str] = None,
    filters: Optional[str] = None,
    beginDateTime=Query(default="2000-01-01"),
    endDateTime: Optional[str] = None,
    user_info: UserInfoModel = Depends(validate_user),
):
    """Get all form responses."""
    begin_datetime, end_datetime = parse_datetime_params(beginDateTime, endDateTime)

    if begin_datetime > end_datetime:
        raise HTTPException(
            status_code=400, detail="beginDateTime value must be lower than endDateTime"
        )

    # Extract province access information
    province = user_info.access.get("province", None)

    form_responses = get_form_responses(
        begin_datetime,
        end_datetime,
        formId,
        datetimeField,
        geomField,
        filters,
        koboUrl,
        province,
    )

    return form_responses


@app.get(
    "/alerts/{id}",
    responses={
        403: {"description": "Access denied. Email addresses do not match."},
        404: {"description": "No alert was found with the given id"},
    },
)
def alert_by_id(
    email: EmailStr,
    deactivate: Optional[bool] = None,
    id: int = Path(1, description="The ID of the alert (an integer)"),
) -> Response:
    """Get alert with an ID."""

    alert = alert_db.readone(id)
    if alert is None:
        raise HTTPException(status_code=404, detail=f"No alert was found with id {id}")

    # secure endpoint with simple email verification
    if email.lower() != alert.email.lower():
        raise HTTPException(
            status_code=403, detail="Access denied. Email addresses do not match."
        )

    # TODO: this modifies data server-side, it should be a PUT or PATCH op, not a GET
    if deactivate:
        success = alert_db.deactivate(alert)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to deactivate alert")

        return JSONResponse(content="Alert successfully deactivated.", status_code=200)

    return JSONResponse(json.dumps(alert, cls=AlchemyEncoder))


@app.post("/alerts")
def post_alerts(alerts_model: AlertsModel):
    """Post new alerts."""
    try:
        # convert the pydantic model to a SQLAlechmy one
        sqla_alert_model = AlertModel(**alerts_model.dict())
        alert_db.write(sqla_alert_model)

    except rasterio.errors.RasterioError as e:
        logger.error(e)
        raise e

    return JSONResponse(content="Success", status_code=200)


@timed
@app.get("/demo", responses={400: {"description": "Invalid intersect_comparison"}})
def stats_demo(
    geojson_out: bool = False,
    group_by: Optional[GroupBy] = None,
    intersect_comparison: Optional[str] = None,
):
    """Return examples of zonal statistics."""
    # The GET endpoint is used for demo purposes only
    geotiff_url = urlunparse(
        ParseResult(
            scheme="https",
            netloc="mongolia.sibelius-datacube.org:5000",
            path="/",
            params="",
            query=urlencode(
                {
                    "service": "WCS",
                    "request": "GetCoverage",
                    "version": "1.0.0",
                    "coverage": "ModisAnomaly",
                    "crs": "EPSG:4326",
                    "bbox": "86.5,36.7,119.7,55.3",
                    "width": "1196",
                    "height": "672",
                    "format": "GeoTIFF",
                    "time": "2020-03-01",
                }
            ),
            fragment="",
        )
    )

    zones_url = urlunparse(
        ParseResult(
            scheme="https",
            netloc="prism-admin-boundaries.s3.us-east-2.amazonaws.com",
            path="mng_admin_boundaries.json",
            params="",
            query="",
            fragment="",
        )
    )

    geotiff = cache_file(prefix="raster_test", url=geotiff_url, extension="tif")

    zones_filepath = cache_file(prefix="zones_test", url=zones_url)

    intersect_comparison_tuple = None
    if intersect_comparison is not None:
        intersect_comparison_tuple = validate_intersect_parameter(intersect_comparison)

    features = _calculate_stats(
        zones_filepath,
        geotiff,
        stats=" ".join(["min", "max", "mean", "median", "sum", "std"]),
        prefix="stats_",
        group_by=group_by,
        geojson_out=geojson_out,
        wfs_response=None,
        intersect_comparison=intersect_comparison_tuple,
        mask_geotiff=None,
    )

    # TODO - Properly encode before returning. Mongolian characters are returned as hex.
    return features
