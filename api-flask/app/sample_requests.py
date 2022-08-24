"""Sample Data for stats and alert."""
import json

from pydantic import BaseModel, EmailStr, Field, HttpUrl, root_validator, validator

stats_data = {
    "geotiff_url": "https://odc.ovio.org/?service=WCS&request=GetCoverage&version=1.0.0"
    "&coverage=r1h_dekad&crs=EPSG%3A4326&bbox=92.2%2C9.7%2C101.2%2C28.5&width=1098"
    "&height=2304&format=GeoTIFF&time=2022-04-11",
    "zones_url": "https://prism-admin-boundaries.s3.us-east-2.amazonaws.com/"
    "mmr_admin_boundaries.json",
    "group_by": "TS",
}

alert_data_zones = {
    "type": "FeatureCollection",
    "name": "admin_boundaries",
    "crs": {
        "type": "name",
        "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
    },
    "features": [
        {
            "type": "Feature",
            "properties": {
                "OBJECTID": 277,
                "ST": "Ayeyarwady",
                "ST_PCODE": "MMR017",
                "DT": "Pyapon",
                "DT_PCODE": "MMR017D006",
                "TS": "Bogale",
                "TS_PCODE": "MMR017024",
                "SELF_ADMIN": None,
                "ST_RG": "Region",
                "TS_MMR4": "ဘိုကလေး",
                "AREA": 1,
                "DT_MMR4": "ဖျာပုံခရိုင်",
                "mmr_polbnd": "ဧရာဝတီတိုင်းဒေသကြီး",
            },
            "geometry": {
                "type": "MultiPolygon",
                "coordinates": [
                    [
                        [
                            [95.3170445470002, 15.928591091000044],
                            [95.31199007400005, 15.926271754000084],
                            [95.3115704550001, 15.928167658000064],
                        ]
                    ]
                ],
            },
        }
    ],
}

alert_data = {
    "alert_name": "flood",
    "alert_config": {
        "id": "rain_anomaly_monthly",
        "type": "wms",
        "title": "Monthly rainfall anomaly",
        "serverLayerName": "r1q_dekad",
        "contentPath": "data/myanmar/contents.md#monthly-rainfall-anomaly",
        "baseUrl": "https://odc.ovio.org/",
        "dateInterval": "days",
        "opacity": 0.7,
        "legendText": "Monthly precipitation anomaly compared to the long term average."
        " Derived from CHIRPS (UCSB Climate Hazards Group)."
        " https://www.chc.ucsb.edu/data/chirps",
        "legend": [
            {"label": "-0", "color": "#ffffff", "alpha": 0},
            {"label": "1%", "color": "#d79b0b"},
            {"label": "60%", "color": "#e1b344"},
            {"label": "80%", "color": "#ebcb7d"},
            {"label": "90%", "color": "#f5e3b6"},
            {"label": "110%", "color": "#f2f2f2"},
            {"label": "120%", "color": "#b5e7fe"},
            {"label": "140%", "color": "#7dd4fd"},
            {"label": "180%", "color": "#45c1fc"},
            {"label": "> 180%", "color": "#0fb0fb"},
        ],
    },
    "zones": alert_data_zones,
    "email": "vik@gmail.com",
    "prism_url": "https://prism-mongolia.org",
}


class WfsParamsModel(BaseModel):
    key: str | None = Field(..., example="label")
    layer_name: str = Field(..., example="mmr_gdacs_buffers")
    time: str = Field(..., example="2022-05-11")
    url: HttpUrl = Field(..., example="https://geonode.wfp.org/geoserver/ows")


class StatsModel(BaseModel):
    """Schema for stats data to be passed to /stats endpoint."""

    geotiff_url: HttpUrl = Field(..., example=stats_data["geotiff_url"])
    zones_url: HttpUrl = Field(..., example=stats_data["zones_url"])
    group_by: str = Field(..., example=stats_data["group_by"])
    wfs_params: WfsParamsModel | None = None
    geojson_out: bool | None = False
    zones: dict | None = None
    intersect_comparison: str | None = None


def must_not_contain_null_char(v: str) -> str:
    if "\x00" in v:
        raise ValueError("Value must not contain null char \x00")
    return v


def dict_must_not_contain_null_char(d: dict) -> dict:
    must_not_contain_null_char(json.dumps(d))
    return d


@root_validator
def check_passwords_match(_, values):
    """Check that at least one values is provided for zones."""
    zones_geojson, zones_url = values.get("zones_geojson"), values.get("zones_url")
    if zones_geojson is None and zones_url is None:
        raise ValueError("One of zones or zones_url is required.")
    return values


class AlertsZonesModel(BaseModel):
    """Schema of the zones argument for alerts."""

    type: str = Field(..., example=alert_data_zones["type"])
    name: str = Field(..., example=alert_data_zones["name"])
    crs: dict = Field(..., example=alert_data_zones["crs"])
    features: dict = Field(..., example=alert_data_zones["features"])

    _val_type = validator("type", allow_reuse=True)(must_not_contain_null_char)
    _val_name = validator("name", allow_reuse=True)(must_not_contain_null_char)
    _val_crs = validator("crs", allow_reuse=True)(dict_must_not_contain_null_char)
    _val_features = validator("features", allow_reuse=True)(
        dict_must_not_contain_null_char
    )


class AlertsModel(BaseModel):
    """Example of alert data for validation by pydantic."""

    email: EmailStr = Field(..., example=alert_data["email"])
    prism_url: HttpUrl = Field(..., example=alert_data["prism_url"])
    alert_name: str = Field(..., example=alert_data["alert_name"])
    alert_config: dict = Field(..., example=alert_data["alert_config"])
    zones: AlertsZonesModel

    _val_alert_name = validator("alert_name", allow_reuse=True)(
        must_not_contain_null_char
    )
    _val_alert_config = validator("alert_config", allow_reuse=True)(
        dict_must_not_contain_null_char
    )
