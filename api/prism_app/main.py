"""FastAPI API for geospatial utils."""

import functools
import json
import logging
import os
from datetime import date
from typing import Annotated, Any, Optional
from urllib.parse import ParseResult, urlencode, urlunparse

import rasterio  # type: ignore
from fastapi import Depends, FastAPI, HTTPException, Path, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from prism_app.auth import validate_user
from prism_app.caching import FilePath, cache_file, cache_geojson
from prism_app.database.alert_model import AlchemyEncoder, AlertModel
from prism_app.database.database import AlertsDataBase
from prism_app.database.user_info_model import UserInfoModel
from prism_app.export_maps import export_maps, extract_dates_from_urls
from prism_app.googleflood import (
    get_google_flood_dates,
    get_google_floods_gauge_forecast,
    get_google_floods_gauges,
    get_google_floods_inundations,
)
from prism_app.hdc import get_hdc_stats
from prism_app.kobo import get_form_dates, get_form_responses, parse_datetime_params
from prism_app.models import AcledRequest, ExportRequestModel, RasterGeotiffModel
from prism_app.report import download_report
from prism_app.timer import timed
from prism_app.validation import validate_intersect_parameter
from prism_app.zonal_stats import (
    DEFAULT_STATS,
    GroupBy,
    calculate_stats,
    get_wfs_response,
)
from pydantic import EmailStr, HttpUrl, ValidationError
from requests import get

from .geotiff_from_stac_api import get_geotiff
from .models import AlertsModel, StatsModel, UserInfoPydanticModel

logging.basicConfig(
    format="%(asctime)s %(levelname)-8s %(message)s",
    level=logging.DEBUG,
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# silence boto3 logging to avoid spamming the logs
logging.getLogger("botocore").setLevel(logging.WARNING)

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
    admin_level: Optional[int] = None,
    simplify_tolerance: Optional[float] = None,
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
        admin_level=admin_level,
        simplify_tolerance=simplify_tolerance,
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
    simplify_tolerance = stats_model.simplify_tolerance

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
        zones = cache_geojson(prefix="zones_geojson", geojson=zones_geojson)
    elif zones_url.endswith(".parquet"):
        zones = zones_url
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
        stats=" ".join(DEFAULT_STATS),
        prefix="stats_",
        group_by=group_by,
        geojson_out=geojson_out,
        wfs_response=(
            frozenset(wfs_response.items()) if wfs_response is not None else None
        ),
        intersect_comparison=intersect_comparison_tuple,
        mask_geotiff=mask_geotiff,
        mask_calc_expr=mask_calc_expr,
        filter_by=filter_by,
        admin_level=stats_model.admin_level,
        simplify_tolerance=simplify_tolerance,
    )

    return features


@app.get("/report")
async def get_report(
    url: str, language: str, exposureLayerId: str, country: str
) -> FileResponse:
    tmp_file_path: str = await download_report(url, exposureLayerId, country, language)
    return FileResponse(path=tmp_file_path, filename=os.path.basename(tmp_file_path))


@app.get("/acled")
def get_acled_incidents(
    iso: int,
    limit: int,
    fields: Optional[str] = None,
    event_date: Optional[date] = None,
):
    acled_url = "https://api.acleddata.com/acled/read"

    try:
        params = AcledRequest(
            iso=iso,
            limit=limit,
            fields=fields,
            event_date=event_date,
        )
    except ValidationError as error:
        raise HTTPException(status_code=422, detail=str(error))

    # Make a new request to acled api including the credentials.
    response = get(acled_url, params=params.dict())
    response.raise_for_status()

    return Response(content=response.content)


@app.get("/hdc")
def wrap_get_hdc_stats(
    level: str, id_code: str, coverage: str, vam: str, start: str, end: str
):
    return JSONResponse(
        content=get_hdc_stats(
            level=level,
            id_code=id_code,
            coverage=coverage,
            vam=vam,
            start=start,
            end=end,
        )
    )


@app.get("/kobo/dates")
def get_kobo_form_dates(
    response: Response,
    koboUrl: HttpUrl,
    formId: str,
    datetimeField: str,
    filters: Optional[str] = None,
):
    """Get all form response dates."""
    # cache responses for 24h as they're unlikely to change
    response.headers["Cache-Control"] = "max-age=86400"
    return get_form_dates(koboUrl, formId, datetimeField, filters)


@app.get("/kobo/forms")
def get_kobo_forms(
    formId: str,
    datetimeField: str,
    koboUrl: HttpUrl,
    user_info: Annotated[UserInfoPydanticModel, Depends(validate_user)],
    geomField: Optional[str] = None,
    filters: Optional[str] = None,
    beginDateTime=Query(default="2000-01-01"),
    endDateTime: Optional[str] = None,
) -> list[dict]:
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
    id: int = Path(description="The ID of the alert (an integer)"),
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
        stats=" ".join(DEFAULT_STATS),
        prefix="stats_",
        group_by=group_by,
        geojson_out=geojson_out,
        wfs_response=None,
        intersect_comparison=intersect_comparison_tuple,
        mask_geotiff=None,
    )

    # TODO - Properly encode before returning. Mongolian characters are returned as hex.
    return features


@app.post("/raster_geotiff", responses={500: {"description": "Internal server error"}})
def post_raster_geotiff(raster_geotiff: RasterGeotiffModel):
    """Get the geotiff of a raster"""
    collection = raster_geotiff.collection
    bbox = (
        raster_geotiff.long_min,
        raster_geotiff.lat_min,
        raster_geotiff.long_max,
        raster_geotiff.lat_max,
    )
    date_value = raster_geotiff.date
    band = raster_geotiff.band
    presigned_download_url = get_geotiff(
        collection,
        bbox,
        date_value,
        band,
        filename_override=raster_geotiff.filename_override,
    )

    return JSONResponse(
        content={"download_url": presigned_download_url}, status_code=200
    )


@app.get("/google-floods/gauges/")
def get_google_floods_gauges_api(
    region_codes: list[str] = Query(...), run_sequentially: bool = Query(default=False)
):
    """
    Get the Google Floods gauges for a list of regions.

    Args:
        region_codes: List of region codes to fetch gauges for
        run_sequentially: If True, requests will be made one at a time. This is helpful
            for debugging but less performant than concurrent requests. Not recommended
            for production use.
    """
    if not region_codes:
        raise HTTPException(
            status_code=400,
            detail="At least one region code must be provided.",
        )
    for region_code in region_codes:
        if len(region_code) != 2:
            raise HTTPException(
                status_code=400,
                detail=f"Region code '{region_code}' must be exactly two characters (iso2).",
            )

    iso2_codes = [region_code.upper() for region_code in region_codes]
    return get_google_floods_gauges(iso2_codes, True, run_sequentially)


@app.get("/google-floods/dates/")
def get_google_floods_dates_api(
    region_codes: list[str] = Query(...), run_sequentially: bool = Query(default=False)
):
    """
    Get the Google Floods dates for a list of regions.

    Args:
        region_codes: List of region codes to fetch dates for
        run_sequentially: If True, requests will be made one at a time. This is helpful
            for debugging but less performant than concurrent requests. Not recommended
            for production use.
    """
    if not region_codes:
        raise HTTPException(
            status_code=400,
            detail="At least one region code must be provided.",
        )

    for region_code in region_codes:
        if len(region_code) != 2:
            raise HTTPException(
                status_code=400,
                detail=f"Region code '{region_code}' must be exactly two characters (iso2).",
            )

    iso2_codes = [region_code.upper() for region_code in region_codes]
    return get_google_flood_dates(iso2_codes, run_sequentially)


@app.get("/google-floods/gauges/forecasts")
def get_google_floods_gauge_forecast_api(
    gauge_ids: str = Query(..., description="Comma-separated list of gauge IDs"),
):
    """Get forecast data for a gauge or multiple gauges"""
    gauge_id_list = [id.strip() for id in gauge_ids.split(",")]
    if not gauge_id_list:
        raise HTTPException(
            status_code=400,
            detail="gauge_ids must be provided and contain at least one value.",
        )
    return get_google_floods_gauge_forecast(gauge_id_list)


@app.get("/google-floods/inundations")
def get_google_floods_inundations_api(
    region_codes: list[str] = Query(...), run_sequentially: bool = Query(default=False)
):
    """Get charts data

    Args:
        region_codes: List of region codes to fetch inundation data for
        run_sequentially: If True, requests will be made one at a time. This is helpful
            for debugging but less performant than concurrent requests. Not recommended
            for production use.
    """
    if not region_codes:
        raise HTTPException(
            status_code=400,
            detail="At least one region code must be provided.",
        )
    for region_code in region_codes:
        if len(region_code) != 2:
            raise HTTPException(
                status_code=400,
                detail=f"Region code '{region_code}' must be exactly two characters (iso2).",
            )

    iso2_codes = [region_code.upper() for region_code in region_codes]

    return get_google_floods_inundations(iso2_codes, run_sequentially)


@timed
@app.post(
    "/export",
    responses={
        400: {
            "description": "Bad request - malformed request body or invalid parameters"
        },
        500: {"description": "Internal server error"},
    },
)
async def export_maps_endpoint(export_request: ExportRequestModel) -> Response:
    """
    Export maps for multiple dates using server-side rendering.

    Accepts a URL with map parameters and a list of dates, renders maps using
    Playwright, and returns either a merged PDF or ZIP archive of PNGs.
    """
    try:
        dates = extract_dates_from_urls(export_request.urls)
        file_bytes, content_type = await export_maps(
            urls=export_request.urls,
            aspect_ratio=export_request.aspectRatio,
            format_type=export_request.format,
        )

        # Generate filename based on format and date range
        # TODO: get dates from URLs
        if export_request.format == "pdf":
            filename = f"maps_{dates[0]}_to_{dates[-1]}.pdf"
        else:
            filename = f"maps_{dates[0]}_to_{dates[-1]}.zip"

        return Response(
            content=file_bytes,
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )

    except ValueError as e:
        logger.error(f"Invalid export request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error during map export: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Internal server error during map export"
        )
