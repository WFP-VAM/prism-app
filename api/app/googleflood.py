"""Get data from Humanitarian Data Cube (HDC) API"""
import logging
from os import getenv

import requests

logger = logging.getLogger(__name__)

GOOGLE_FLOODS_API_KEY = getenv("GOOGLE_FLOODS_API_KEY", "")
if GOOGLE_FLOODS_API_KEY == "":
    logger.warning("Missing backend parameter: GOOGLE_FLOODS_API_KEY")

def format_to_geojson(data):
    geojson = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [data["gaugeLocation"]["longitude"], data["gaugeLocation"]["latitude"]]
        },
        "properties": {
            "gaugeId": data["gaugeId"],
            "issuedTime": data["issuedTime"],
            # "forecastTimeRange": data["forecastTimeRange"],
            # "forecastChange": data["forecastChange"],
            # "forecastTrend": data["forecastTrend"],
            "severity": data["severity"],
            "source": data["source"],
            "qualityVerified": data["qualityVerified"]
        }
    }
    if "inundationMapSet" in data:
        geojson["properties"]["inundationMapSet"] = data["inundationMapSet"]
    return geojson


def get_google_floods_gauges(
    iso2: str,
    asGeojson: bool = True,
):
    """Get statistical charts data"""
    logging.info(GOOGLE_FLOODS_API_KEY)

    URL = f'https://floodforecasting.googleapis.com/v1/floodStatus:searchLatestFloodStatusByArea?key={GOOGLE_FLOODS_API_KEY}'
    response = requests.post(
        URL,
        json={'regionCode': iso2}
    ).json().get('floodStatuses', [])
    
    if asGeojson:
        geojson_feature_collection = {
            "type": "FeatureCollection",
            "features": [format_to_geojson(data) for data in response]
        }
        return geojson_feature_collection
    return response


