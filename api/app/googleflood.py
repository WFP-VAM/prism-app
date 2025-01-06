"""Get data from Google Floods API"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from os import getenv
from urllib.parse import urlencode

from fastapi import HTTPException

from .utils import make_request_with_retries

logger = logging.getLogger(__name__)

GOOGLE_FLOODS_API_KEY = getenv("GOOGLE_FLOODS_API_KEY", "")
if GOOGLE_FLOODS_API_KEY == "":
    logger.warning("Missing backend parameter: GOOGLE_FLOODS_API_KEY")


def format_gauge_to_geojson(data):
    """Format Gauge data to GeoJSON"""
    geojson = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [
                data["gaugeLocation"]["longitude"],
                data["gaugeLocation"]["latitude"],
            ],
        },
        "properties": {
            "gaugeId": data["gaugeId"],
            "issuedTime": data["issuedTime"],
            "siteName": data["siteName"],
            "riverName": (
                data["river"] if "river" in data and len(data["river"]) > 1 else None
            ),
            "severity": data.get("severity", None),
            "source": data.get("source", None),
            "qualityVerified": data.get("qualityVerified", None),
            "thresholds": data.get("thresholds", None),
            "gaugeValueUnit": data.get("gaugeValueUnit", None),
        },
    }
    if "inundationMapSet" in data:
        geojson["properties"]["inundationMapSet"] = data["inundationMapSet"]
    return geojson


def fetch_flood_status(region_code):
    """Fetch flood status for a region code"""
    flood_status_url = f"https://floodforecasting.googleapis.com/v1/floodStatus:searchLatestFloodStatusByArea?key={GOOGLE_FLOODS_API_KEY}"
    status_response = make_request_with_retries(
        flood_status_url, method="post", data={"regionCode": region_code}, retries=3
    )
    return status_response


def fetch_flood_statuses_concurrently(region_codes: list[str]) -> list[dict]:
    """Fetch flood statuses concurrently for a list of region codes."""
    flood_statuses = []
    with ThreadPoolExecutor() as executor:
        future_to_region = {
            executor.submit(fetch_flood_status, code): code for code in region_codes
        }
        for future in as_completed(future_to_region):
            status_response = future.result()
            if "error" in status_response:
                logger.error("Error in response: %s", status_response["error"])
                raise HTTPException(
                    status_code=500,
                    detail="Error fetching flood status data from Google API",
                )
            flood_statuses.extend(status_response.get("floodStatuses", []))
    return flood_statuses


def get_google_flood_dates(region_codes: list[str]):
    """Fetch dates from the Google Floods API."""
    flood_statuses = fetch_flood_statuses_concurrently(region_codes)

    parsed_issued_times = [
        datetime.strptime(status["issuedTime"], "%Y-%m-%dT%H:%M:%S.%fZ")
        for status in flood_statuses
        if "issuedTime" in status
    ]
    parsed_issued_times.sort(reverse=True)  # Sort in descending order

    # Format only the most recent date
    most_recent_date = (
        {
            "date": parsed_issued_times[0]
            .replace(tzinfo=timezone.utc)
            .strftime("%Y-%m-%d")
        }
        if parsed_issued_times
        else {}
    )

    return [most_recent_date] if most_recent_date else []


def get_google_floods_gauges(
    region_codes: list[str],
    as_geojson: bool = True,
):
    """Get statistical charts data"""
    initial_gauges = fetch_flood_statuses_concurrently(region_codes)

    gauge_details_params = urlencode(
        {"names": [f"gauges/{gauge['gaugeId']}" for gauge in initial_gauges]},
        doseq=True,
    )
    gauges_details_url = f"https://floodforecasting.googleapis.com/v1/gauges:batchGet?key={GOOGLE_FLOODS_API_KEY}&{gauge_details_params}"

    gauge_models_params = urlencode(
        {"names": [f"gaugeModels/{gauge['gaugeId']}" for gauge in initial_gauges]},
        doseq=True,
    )
    gauges_models_url = f"https://floodforecasting.googleapis.com/v1/gaugeModels:batchGet?key={GOOGLE_FLOODS_API_KEY}&{gauge_models_params}"

    # Run both requests
    details_response = make_request_with_retries(gauges_details_url)
    models_response = make_request_with_retries(gauges_models_url)

    # Create maps for quick lookup
    gauge_details_map = {
        item["gaugeId"]: item for item in details_response.get("gauges", [])
    }
    gauge_models_map = {
        item["gaugeId"]: item for item in models_response.get("gaugeModels", [])
    }

    gauges_details = []
    for gauge in initial_gauges:
        gauge_id = gauge["gaugeId"]
        detail = gauge_details_map.get(gauge_id, {})
        model = gauge_models_map.get(gauge_id, {})
        merged_gauge = {**gauge, **detail, **model}
        gauges_details.append(merged_gauge)

    if as_geojson:
        features = []
        for gauge in gauges_details:
            try:
                feature = format_gauge_to_geojson(gauge)
                features.append(feature)
            except Exception as e:
                logger.error(
                    "Failed to format gauge %s: %s", gauge.get("gaugeId"), str(e)
                )
                continue

        geojson_feature_collection = {
            "type": "FeatureCollection",
            "features": features,
        }
        return geojson_feature_collection
    return gauges_details


def get_google_floods_gauge_forecast(gauge_ids: list[str]):
    """Get forecast data for a gauge"""

    gauge_params = urlencode(
        {"gaugeIds": [gauge_id for gauge_id in gauge_ids]},
        doseq=True,
    )
    forecast_url = f"https://floodforecasting.googleapis.com/v1/gauges:queryGaugeForecasts?key={GOOGLE_FLOODS_API_KEY}&{gauge_params}"
    forecast_response = make_request_with_retries(forecast_url)

    forecasts = forecast_response.get("forecasts", {})

    forecast_data = {}
    for gauge_id in gauge_ids:
        forecast_map = {}
        for forecast in forecasts.get(gauge_id, {}).get("forecasts", []):
            issued_time = forecast.get("issuedTime")
            for forecast_range in forecast.get("forecastRanges", []):
                start_time = forecast_range.get("forecastStartTime")
                value = round(forecast_range.get("value"), 2)

                # Deduplicate by forecastStartTime, keeping the most recent issuedTime
                if (
                    start_time not in forecast_map
                    or issued_time > forecast_map[start_time]["issuedTime"]
                ):
                    forecast_map[start_time] = {
                        "issuedTime": issued_time,
                        "value": [start_time, value],
                    }

        forecast_data[gauge_id] = list(forecast_map.values())

    return forecast_data
