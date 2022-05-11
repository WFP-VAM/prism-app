"""Sample Data for stats and alert."""
from pydantic import BaseModel, Field


stats_data = {
     'geotiff_url': 'https://odc.ovio.org/?service=WCS&request=GetCoverage&version=1.0.0'
                    '&coverage=r1h_dekad&crs=EPSG%3A4326&bbox=92.2%2C9.7%2C101.2%2C28.5&width=1098'
                    '&height=2304&format=GeoTIFF&time=2022-04-11',
     'zones_url': 'https://prism-admin-boundaries.s3.us-east-2.amazonaws.com/'
                  'mmr_admin_boundaries.json',
     'group_by': 'TS'
}

alert_data = {
    'alert_name': 'flood',
    'alert_config': {
        'id': 'rain_anomaly_monthly',
        'type': 'wms',
        'title': 'Monthly rainfall anomaly',
        'serverLayerName': 'r1q_dekad',
        'contentPath': 'data/myanmar/contents.md#monthly-rainfall-anomaly',
        'baseUrl': 'https://odc.ovio.org/',
        'dateInterval': 'days',
        'opacity': 0.7,
        'legendText': 'Monthly precipitation anomaly compared to the long term average.'
                      ' Derived from CHIRPS (UCSB Climate Hazards Group).'
                      ' https://www.chc.ucsb.edu/data/chirps',
        'legend': [
            {
                'label': '-0',
                'color': '#ffffff',
                'alpha': 0
            },
            {
                'label': '1%',
                'color': '#d79b0b'
            },
            {
                'label': '60%',
                'color': '#e1b344'
            },
            {
                'label': '80%',
                'color': '#ebcb7d'
            },
            {
                'label': '90%',
                'color': '#f5e3b6'
            },
            {
                'label': '110%',
                'color': '#f2f2f2'
            },
            {
                'label': '120%',
                'color': '#b5e7fe'
            },
            {
                'label': '140%',
                'color': '#7dd4fd'
            },
            {
                'label': '180%',
                'color': '#45c1fc'
            },
            {
                'label': '> 180%',
                'color': '#0fb0fb'
            }
        ]
    },
    'zones': {
        'type': 'FeatureCollection',
        'name': 'admin_boundaries',
        'crs': {
            'type': 'name',
            'properties': {
                'name': 'urn:ogc:def:crs:OGC:1.3:CRS84'
            }
        },
        'features': [
            {
                'type': 'Feature',
                'properties': {
                    'OBJECTID': 277,
                    'ST': 'Ayeyarwady',
                    'ST_PCODE': 'MMR017',
                    'DT': 'Pyapon',
                    'DT_PCODE': 'MMR017D006',
                    'TS': 'Bogale',
                    'TS_PCODE': 'MMR017024',
                    'SELF_ADMIN': None,
                    'ST_RG': 'Region',
                    'TS_MMR4': 'ဘိုကလေး',
                    'AREA': 1,
                    'DT_MMR4': 'ဖျာပုံခရိုင်',
                    'mmr_polbnd': 'ဧရာဝတီတိုင်းဒေသကြီး'
                },
                'geometry': {
                    'type': 'MultiPolygon',
                    'coordinates': [
                        [
                            [
                                [
                                    95.3170445470002,
                                    15.928591091000044
                                ],
                                [
                                    95.31199007400005,
                                    15.926271754000084
                                ],
                                [
                                    95.3115704550001,
                                    15.928167658000064
                                ],
                            ]
                        ]
                    ]
                }
            }
        ]
    },
    'email': 'vik@gmail.com',
    'prism_url': 'https://prism-mongolia.org'
}


class StatsModel(BaseModel):
    """Example of stats data."""

    geotiff_url: str = Field(..., example=stats_data['geotiff_url'])
    zones_url: str = Field(..., example=stats_data['zones_url'])
    group_by: str = Field(..., example=stats_data['group_by'])


class AlertsModel(BaseModel):
    """Example of alert data."""

    email: str = Field(..., example=alert_data['email'])
    prism_url: str = Field(..., example=alert_data['prism_url'])
    alert_name: str = Field(..., example=alert_data['alert_name'])
    alert_config: dict = Field(..., example=alert_data['alert_config'])
    zones: dict = Field(..., example=alert_data['zones'])
