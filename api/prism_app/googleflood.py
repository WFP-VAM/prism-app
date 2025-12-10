"""Get data from Google Floods API"""

import json
import logging
import os
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import List
from urllib.parse import urlencode

import geopandas as gpd
import pandas as pd
import requests
from fastapi import HTTPException
from fiona.drvsupport import supported_drivers
from pydantic import BaseModel

from .caching import cache_geojson, get_cache_by_key
from .utils import make_request_with_retries

supported_drivers["LIBKML"] = "rw"

logger = logging.getLogger(__name__)


class InundationMap(BaseModel):
    level: str
    serializedPolygonId: str


class InundationMapSet(BaseModel):
    inundationMaps: List[InundationMap]


# This cache helps avoid making repeated requests to the Google Floods API
CACHE_TIMEOUT = 600  # 10 minutes
GOOGLE_FLOODS_API_KEY = os.getenv("GOOGLE_FLOODS_API_KEY", "")
if GOOGLE_FLOODS_API_KEY == "":
    logger.warning("Missing backend parameter: GOOGLE_FLOODS_API_KEY")


def make_google_floods_request(url, method="get", data=None, retries=1, timeout=10):
    """Make a request with retries and error handling, caching the result for 10 minutes."""
    # Create a unique cache key based on the request parameters
    request_data = json.dumps(data, sort_keys=True) if data else ""
    cache_key = f"{url}_{method}_{request_data}"
    cached_response = get_cache_by_key(
        prefix="google_floods", cache_key=cache_key, cache_timeout=CACHE_TIMEOUT
    )
    if cached_response:
        return cached_response

    # If not cached or expired, make the request
    for _ in range(retries):
        try:
            if method == "post":
                response = requests.post(url, json=data, timeout=timeout)
            else:
                response = requests.get(url, timeout=timeout)

            response_data = response.json()
            break
        except requests.exceptions.RequestException as e:
            logger.warning("Request failed at url %s: %s", url, e)
            response_data = {}

    if "error" in response_data:
        logger.error("Error in response: %s", response_data["error"])
        raise HTTPException(
            status_code=500, detail="Error fetching data from Google API"
        )

    cache_geojson(response_data, prefix="google_floods", cache_key=cache_key)

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


def fetch_flood_statuses(
    region_codes: list[str], run_sequentially: bool = False
) -> list[dict]:
    """Fetch flood statuses concurrently for a list of region codes.

    Args:
        region_codes: List of region codes to fetch statuses for
        run_sequentially: If True, requests will be made one at a time. This is helpful
            for debugging but less performant than concurrent requests. Not recommended
            for production use.
    """
    flood_statuses = []
    if run_sequentially:
        for code in region_codes:
            status_response = make_google_floods_request(
                f"https://floodforecasting.googleapis.com/v1/floodStatus:searchLatestFloodStatusByArea?key={GOOGLE_FLOODS_API_KEY}",
                method="post",
                data={"regionCode": code},
                retries=3,
            )
            if "error" in status_response:
                logger.error("Error in response: %s", status_response["error"])
                raise HTTPException(
                    status_code=500,
                    detail="Error fetching flood status data from Google API",
                )
            flood_statuses.extend(status_response.get("floodStatuses", []))
    else:
        with ThreadPoolExecutor() as executor:
            future_to_region = {
                executor.submit(
                    make_google_floods_request,
                    f"https://floodforecasting.googleapis.com/v1/floodStatus:searchLatestFloodStatusByArea?key={GOOGLE_FLOODS_API_KEY}",
                    method="post",
                    data={"regionCode": code},
                    retries=3,
                ): code
                for code in region_codes
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


def get_google_flood_dates(region_codes: list[str], run_sequentially: bool = False):
    """
    When more complex date support is needed, this can be used to fetch dates from the Google Floods API.

    For now, we just return today's date at the region
    """
    flood_statuses = fetch_flood_statuses(region_codes, run_sequentially)

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
    region_codes: list[str], as_geojson: bool = True, run_sequentially: bool = False
):
    """Get statistical charts data"""
    initial_gauges = fetch_flood_statuses(region_codes, run_sequentially)

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

    # Gauge models request may fail if some gauges don't have models
    # Continue without model data in that case (thresholds, gaugeValueUnit will be None)
    try:
        models_response = make_request_with_retries(gauges_models_url)
    except HTTPException:
        logger.warning(
            "Failed to fetch gauge models, continuing without model data. "
            "Some gauges may be missing thresholds and gaugeValueUnit."
        )
        models_response = {}

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


class InundationMap(BaseModel):
    level: str
    serializedPolygonId: str


def fetch_kml(inundationMap):
    try:
        url = f"https://floodforecasting.googleapis.com/v1/serializedPolygons/{inundationMap['serializedPolygonId']}?key={GOOGLE_FLOODS_API_KEY}"
        logger.debug(f"Fetching KML from URL: {url}")
        response = requests.get(url)
        response.raise_for_status()  # Ensure we raise an error for bad responses
        return inundationMap["level"], response.json()["kml"]
    except requests.exceptions.RequestException as e:
        logger.error("Error fetching KML: %s", e)
        raise


def get_google_floods_inundations(
    region_codes: List[str], run_sequentially: bool = False
) -> gpd.GeoDataFrame:
    # Generate a cache key based on the region codes and run mode
    cache_key = f"{'_'.join(region_codes)}_{run_sequentially}"
    cached_inundations = get_cache_by_key(
        prefix="inundations", cache_key=cache_key, cache_timeout=CACHE_TIMEOUT
    )
    if cached_inundations:
        return cached_inundations

    # Fetch gauge data
    gauge_data = get_google_floods_gauges(region_codes, as_geojson=False)

    inundationMapSet = []
    for gd in gauge_data:
        if "inundationMapSet" in gd.keys():
            inundationMapSet += gd["inundationMapSet"]["inundationMaps"]

    level_to_kml = {}

    def fetch_and_cache_kml(inundationMap):
        level, kml = fetch_kml(inundationMap)
        level_to_kml[level] = kml

    # Fetch KML data
    if run_sequentially:
        for inundationMap in inundationMapSet:
            fetch_and_cache_kml(inundationMap)
    else:
        with ThreadPoolExecutor() as executor:
            executor.map(fetch_and_cache_kml, inundationMapSet)

    # Process KML data into GeoDataFrames
    tmp_path = os.path.join(f"/tmp/google-floods/{str(uuid.uuid4())}")
    if not os.path.exists(tmp_path):
        os.makedirs(tmp_path)

    gdf_buff = []
    for level, kml in level_to_kml.items():
        kml_file = os.path.join(tmp_path, f"{level}.kml")
        with open(kml_file, "w") as f:
            f.write(kml)
        gdf = gpd.read_file(kml_file, driver="KML")
        gdf["level"] = level
        gdf_buff.append(gdf)

    if gdf_buff:
        # Concatenate all GeoDataFrames in the buffer
        combined_gdf = pd.concat(gdf_buff, ignore_index=True)
        # Convert the combined GeoDataFrame to GeoJSON
        geojson = json.loads(combined_gdf.to_json())
    else:
        # Return an empty GeoJSON FeatureCollection
        geojson = {"type": "FeatureCollection", "features": []}

    # Cache the final GeoJSON
    cache_geojson(geojson, prefix="inundations", cache_key=cache_key)

    return geojson
