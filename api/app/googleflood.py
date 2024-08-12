"""Get data from Humanitarian Data Cube (HDC) API"""

import logging
from os import getenv

import requests
from fastapi import HTTPException

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
            # "forecastTimeRange": data["forecastTimeRange"],
            # "forecastChange": data["forecastChange"],
            # "forecastTrend": data["forecastTrend"],
            "severity": data["severity"],
            "source": data["source"],
            "qualityVerified": data["qualityVerified"],
        },
    }
    if "inundationMapSet" in data:
        geojson["properties"]["inundationMapSet"] = data["inundationMapSet"]
    return geojson


def get_google_floods_gauges(
    iso2: str,
    as_geojson: bool = True,
):
    """Get statistical charts data"""
    # Retry 3 times due to intermittent API errors
    flood_status_url = f"https://floodforecasting.googleapis.com/v1/floodStatus:searchLatestFloodStatusByArea?key={GOOGLE_FLOODS_API_KEY}"
    for _ in range(3):
        try:
            response = requests.post(
                flood_status_url, json={"regionCode": iso2}, timeout=2
            ).json()
            break
        except requests.RequestException as e:
            logger.warning("Request failed: %s", e)
            response = {}

    if "error" in response:
        logger.error("Error in response: %s", response["error"])
        raise HTTPException(
            status_code=500, detail="Error fetching flood status data from Google API"
        )

    gauges = response.get("floodStatuses", [])

    if as_geojson:
        geojson_feature_collection = {
            "type": "FeatureCollection",
            "features": [format_gauge_to_geojson(gauge) for gauge in gauges],
        }
        return geojson_feature_collection
    return gauges
