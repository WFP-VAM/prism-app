"""FastAPI API for geospatial utils."""

import json
import logging
from distutils.util import strtobool
from os import getenv
from typing import Optional
from urllib.parse import ParseResult, urlencode, urlunparse

import rasterio  # type: ignore
from fastapi import FastAPI, HTTPException, Path, Query, Response
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from app.caching import cache_file, cache_geojson
from app.database.alert_database import AlertsDataBase
from app.database.alert_model import AlchemyEncoder, AlertModel
# from app.errors import handle_error, make_json_error
from app.kobo import get_form_responses, parse_datetime_params
from app.timer import timed
from app.validation import validate_intersect_parameter
from app.zonal_stats import GroupBy, calculate_stats, get_wfs_response
from pydantic import EmailStr, HttpUrl

from .sample_requests import AlertsModel, StatsModel

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PRISM Geospatial API by WFP",
    description="A geospatial API enabling aggregation and intersection calculations "
    "between rasters and polygons.",
)

# For more configuration options, check out the documentation
# Caching durations are in seconds.
# cache = Cache(app, config={"CACHE_TYPE": "simple"})

alert_db = AlertsDataBase()

# for code in [400, 401, 403, 404, 405, 500]:
#     app.register_error_handler(code, make_json_error)
# app.register_error_handler(Exception, handle_error)


# alerts_model = api.model("Alerts", alerts_dic)
# stats_model = api.model("Stats", stats_dic)


@app.get("/")
def healthcheck() -> str:
    """Verify that the server is healthy."""
    return "All good!"


@timed
# @cache.memoize(3600)
def _calculate_stats(
    zones,
    geotiff,
    stats,
    prefix,
    group_by,
    geojson_out,
    wfs_response,
    intersect_comparison,
):
    """Calculate stats."""
    return calculate_stats(
        zones,
        geotiff,
        stats=stats,
        prefix=prefix,
        group_by=group_by,
        geojson_out=geojson_out,
        wfs_response=wfs_response,
        intersect_comparison=intersect_comparison,
    )


@timed
@app.post("/stats", responses={500: {"description": "Internal server error"}})
def stats(stats_model: StatsModel) -> Response:
    """Return zonal statistics."""
    # Accept data as json or form.
    logger.debug("New stats request:")
    logger.debug(stats_model)
    data = jsonable_encoder(stats_model)
    geotiff_url = data.get("geotiff_url")
    zones_url = data.get("zones_url")
    zones_geojson = data.get("zones")
    intersect_comparison_string = data.get("intersect_comparison")

    if geotiff_url is None:
        logger.error("Received {}".format(data))
        raise HTTPException(status_code=400, detail="geotiff_url is required")

    if zones_geojson is None and zones_url is None:
        logger.error("Received {}".format(data))
        raise HTTPException(
            status_code=400, detail="One of zones or zones_url is required."
        )

    geojson_out = strtobool(data.get("geojson_out", "False"))
    group_by = data.get("group_by")

    geotiff = cache_file(prefix="raster", url=geotiff_url, extension="tif")

    if zones_geojson is not None:
        zones = cache_geojson(prefix="zones_geojson", geojson=zones_geojson)
    else:
        zones = cache_file(
            prefix="zones",
            url=zones_url,
            extension="json",
        )

    wfs_response = None
    wfs_params = data.get("wfs_params", None)
    if wfs_params is not None:
        # Validate required keys.
        required_keys = ["layer_name", "url", "time"]
        missing = [f for f in required_keys if f not in wfs_params.keys()]

        if len(missing) > 0:
            logger.error("Received {}".format(data))
            err_message = "{} required within wfs_params object"
            joined_missing = ",".join(missing)
            raise HTTPException(
                status_code=400, detail=err_message.format(joined_missing)
            )

        wfs_response = get_wfs_response(wfs_params)

    intersect_comparison_tuple = None
    if intersect_comparison_string is not None:
        intersect_comparison_tuple = validate_intersect_parameter(
            intersect_comparison_string
        )

    features = _calculate_stats(
        zones,
        geotiff,
        stats=["min", "max", "mean", "median", "sum", "std"],
        prefix="stats_",
        group_by=group_by,
        geojson_out=geojson_out,
        wfs_response=wfs_response,
        intersect_comparison=intersect_comparison_tuple,
    )

    return features

    # TODO - Secure endpoint
    # @app.route('/alerts-all', methods=['GET'])
    # def alerts_all():
    #     """Get all alerts in current table."""
    #     results = alert_db.readall()
    #     return Response(json.dumps(results, cls=AlchemyEncoder), mimetype='application/json')


@app.get("/kobo/forms")
def get_kobo_forms(
    formName: str,
    datetimeField: str,
    koboUrl: HttpUrl,
    geomField: str | None = None,
    filters: str | None = None,
    beginDateTime=Query(default="2000-01-01"),
    endDateTime: str | None = None,
):
    """Get all form responses."""
    begin_datetime, end_datetime = parse_datetime_params(beginDateTime, endDateTime)

    if begin_datetime > end_datetime:
        raise HTTPException(
            status_code=400, detail="beginDateTime value must be lower than endDateTime"
        )
    form_responses = get_form_responses(
        begin_datetime,
        end_datetime,
        formName,
        datetimeField,
        geomField,
        filters,
        koboUrl,
    )

    return form_responses


@app.get("/alerts/{id}", responses={
    403: {"description": "Access denied. Email addresses do not match."},
    404: {"description": "No alert was found with the given id"}
})
def alert_by_id(
    email: EmailStr,
    deactivate: bool | None = None,
    id: int = Path(1, description="The ID of the alert (an integer)"),
) -> Response:
    """Get alert with an ID."""
    # try:
    #     id = int(id)
    # except ValueError as e:
    #     logger.error(f"Failed to fetch alerts: {e}")
    #     raise HTTPException(status_code=400, detail="Invalid id")

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


# TODO: take care of @timed
# @timed
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

    zones = cache_file(prefix="zones_test", url=zones_url)

    # intersect_comparison_string = request.args.get("intersect_comparison", None)

    intersect_comparison_tuple = None
    if intersect_comparison is not None:
        intersect_comparison_tuple = validate_intersect_parameter(intersect_comparison)

    features = _calculate_stats(
        zones,
        geotiff,
        stats=["min", "max", "mean", "median", "sum", "std"],
        prefix="stats_",
        group_by=group_by,
        geojson_out=geojson_out,
        wfs_response=None,
        intersect_comparison=intersect_comparison_tuple,
    )

    # TODO - Properly encode before returning. Mongolian characters are returned as hex.
    return features


# if __name__ == "__main__" and getenv("FLASK_ENV") == "development":
#     PORT = int(getenv("PORT", 80))
#     # Only for debugging while developing
#     app.run(host="0.0.0.0", debug=True, port=PORT)
