"""Get data from Google Floods API"""

import logging
from os import getenv
from urllib.parse import urlencode

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
            "siteName": data["siteName"],
            "river": (
                data["river"] if "river" in data and len(data["river"]) > 1 else None
            ),
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
            status_response = requests.post(
                flood_status_url, json={"regionCode": iso2}, timeout=2
            ).json()
            break
        except requests.RequestException as e:
            logger.warning("Request failed at url %s: %s", flood_status_url, e)
            status_response = {}

    if "error" in status_response:
        logger.error("Error in response: %s", status_response["error"])
        raise HTTPException(
            status_code=500, detail="Error fetching flood status data from Google API"
        )

    initial_gauges = status_response.get("floodStatuses", [])

    gauge_params = urlencode(
        {"names": [f"gauges/{gauge['gaugeId']}" for gauge in initial_gauges]},
        doseq=True,
    )
    gauges_details_url = f"https://floodforecasting.googleapis.com/v1/gauges:batchGet?key={GOOGLE_FLOODS_API_KEY}&{gauge_params}"

    try:
        details_response = requests.get(gauges_details_url, timeout=2).json()
    except requests.RequestException as e:
        logger.warning("Request failed at url %s: %s", gauges_details_url, e)
        details_response = {}

    if "error" in details_response:
        logger.error("Error in response: %s", details_response["error"])
        raise HTTPException(
            status_code=500, detail="Error fetching gauges details from Google API"
        )

    # Create a map for quick lookup
    gauge_details_map = {
        item["gaugeId"]: item for item in details_response.get("gauges", [])
    }

    gauges_details = []
    for gauge in initial_gauges:
        gauge_id = gauge["gaugeId"]
        detail = gauge_details_map.get(gauge_id, {})
        merged_gauge = {**gauge, **detail}
        gauges_details.append(merged_gauge)

    if as_geojson:
        geojson_feature_collection = {
            "type": "FeatureCollection",
            "features": [format_gauge_to_geojson(gauge) for gauge in gauges_details],
        }
        return geojson_feature_collection
    return gauges_details
