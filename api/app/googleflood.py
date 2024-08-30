"""Get data from Google Floods API"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from os import getenv
from urllib.parse import urlencode

import requests
from fastapi import HTTPException

logger = logging.getLogger(__name__)

GOOGLE_FLOODS_API_KEY = getenv("GOOGLE_FLOODS_API_KEY", "")
if GOOGLE_FLOODS_API_KEY == "":
    logger.warning("Missing backend parameter: GOOGLE_FLOODS_API_KEY")


def make_google_floods_request(url, method="get", data=None, retries=1, timeout=2):
    """Make a request with retries and error handling."""
    for _ in range(retries):
        try:
            if method == "post":
                response_data = requests.post(url, json=data, timeout=timeout).json()
            else:
                response_data = requests.get(url, timeout=timeout).json()
            break
        except requests.exceptions.RequestException as e:
            logger.warning("Request failed at url %s: %s", url, e)
            response_data = {}

    if "error" in response_data:
        logger.error("Error in response: %s", response_data["error"])
        raise HTTPException(
            status_code=500, detail="Error fetching data from Google API"
        )

    return response_data


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
            "severity": data["severity"],
            "source": data["source"],
            "qualityVerified": data["qualityVerified"],
            "thresholds": data["thresholds"],
            "gaugeValueUnit": data["gaugeValueUnit"],
        },
    }
    if "inundationMapSet" in data:
        geojson["properties"]["inundationMapSet"] = data["inundationMapSet"]
    return geojson


def fetch_flood_status(region_code):
    """Fetch flood status for a region code"""
    flood_status_url = f"https://floodforecasting.googleapis.com/v1/floodStatus:searchLatestFloodStatusByArea?key={GOOGLE_FLOODS_API_KEY}"
    status_response = make_google_floods_request(
        flood_status_url, method="post", data={"regionCode": region_code}, retries=3
    )
    return status_response


def get_google_floods_gauges(
    region_codes: list[str],
    as_geojson: bool = True,
):
    """Get statistical charts data"""
    initial_gauges = []

    # Retry 3 times due to intermittent API errors
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
            initial_gauges.extend(status_response.get("floodStatuses", []))

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
    details_response = make_google_floods_request(gauges_details_url)
    models_response = make_google_floods_request(gauges_models_url)

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
        geojson_feature_collection = {
            "type": "FeatureCollection",
            "features": [format_gauge_to_geojson(gauge) for gauge in gauges_details],
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
    forecast_response = make_google_floods_request(forecast_url)

    forecasts = forecast_response.get("forecasts", {})

    forecast_data = {
        gauge_id: [
            {
                "value": [
                    forecast_range.get("forecastStartTime"),
                    forecast_range.get("value"),
                ]
            }
            for forecast in forecasts.get(gauge_id, {}).get("forecasts", [])
            for forecast_range in forecast.get("forecastRanges", [])
        ]
        for gauge_id in gauge_ids
    }

    return forecast_data
