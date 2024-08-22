"""Get data from Humanitarian Data Cube (HDC) API"""
import logging
import os
import requests
import geopandas as gpd
import pandas as pd
import uuid

from fiona.drvsupport import supported_drivers
supported_drivers['LIBKML'] = 'rw'

logger = logging.getLogger(__name__)

GOOGLE_FLOODS_API_KEY = os.getenv("GOOGLE_FLOODS_API_KEY", "")
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
            # not present on all data tested at this point
            # handle in the future
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


from pydantic import BaseModel
from typing import List

class InundationMap(BaseModel):
    level: str
    serializedPolygonId: str

class InundationMapSet(BaseModel):
    inundationMaps: List[InundationMap]


def get_google_floods_inundations(
    inundationMapSet: InundationMapSet,
) -> gpd.GeoDataFrame:
    """Get statistical charts data"""
    level_to_kml = dict()
    URL = 'https://floodforecasting.googleapis.com/v1/serializedPolygons/{serializedPolygonId}?key={key}'
    for inundationMap in inundationMapSet:
        response = requests.get(
            URL.format(
                serializedPolygonId=inundationMap['serializedPolygonId'],
                key = GOOGLE_FLOODS_API_KEY
            )
        ).json()
        level_to_kml[inundationMap['level']] = response['kml']
    
    # Create a temp path for writing kmls
    tmp_path = os.path.join(f'/tmp/google-floods/{str(uuid.uuid4())}')
    if not os.path.exists(tmp_path):
        os.makedirs(tmp_path)
        
    gdf_buff = []
    for level, kml in level_to_kml.items():
        kml_path = os.path.join(tmp_path, f'{level}.kml')
        with open(kml_path, 'w') as f:
            f.write(kml)
        gdf = gpd.read_file(kml_path, driver='KML')
        gdf['level'] = level
        gdf_buff.append(gdf)
    
    gdf = pd.concat(gdf_buff)
    return gdf
