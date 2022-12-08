import json
from typing import NewType, Optional, TypedDict

from pydantic import BaseModel, EmailStr, Field, HttpUrl, root_validator, validator

from .sample_requests import alert_data, alert_data_zones, stats_data

FilePath = NewType("FilePath", str)

GroupBy = NewType("GroupBy", str)

# a GeoJSON object
Geometry = TypedDict("Geometry", {"type": str})
GeoJSONFeature = TypedDict(
    "GeoJSONFeature", {"type": str, "geometry": Geometry, "properties": dict}
)
GeoJSON = TypedDict("GeoJSON", {"features": list[GeoJSONFeature]})

WfsResponse = TypedDict("WfsResponse", {"filter_property_key": str, "path": FilePath})


class WfsParamsModel(BaseModel):
    key: str = Field(..., example="label")
    layer_name: str = Field(..., example="mmr_gdacs_buffers")
    time: str = Field(..., example="2022-05-11")
    url: HttpUrl = Field(..., example="https://geonode.wfp.org/geoserver/ows")


class FilterProperty(BaseModel):
    key: str = Field(..., example="Adm2_Name")
    value: str = Field(..., example="Barranquilla")


class StatsModel(BaseModel):
    """Schema for stats data to be passed to /stats endpoint."""

    geotiff_url: HttpUrl = Field(..., example=stats_data["geotiff_url"])
    zones_url: HttpUrl = Field(..., example=stats_data["zones_url"])
    group_by: str = Field(..., example=stats_data["group_by"])
    wfs_params: Optional[WfsParamsModel] = None
    geojson_out: Optional[bool] = False
    zones: Optional[GeoJSON] = None
    intersect_comparison: Optional[str] = None
    mask_url: Optional[str] = None
    mask_calc_expr: Optional[str] = None
    filter_by: Optional[FilterProperty] = None


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
    features: dict | list[dict] = Field(..., example=alert_data_zones["features"])

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
