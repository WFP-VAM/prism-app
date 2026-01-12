import json
from datetime import date, datetime
from os import getenv
from typing import Any, Literal, NewType, Optional, TypedDict

from pydantic import BaseModel, EmailStr, Field, HttpUrl, root_validator, validator

from .sample_requests import alert_data, alert_data_zones, stats_data

FilePath = NewType("FilePath", str)

GroupBy = NewType("GroupBy", str)

# a GeoJSON object
Geometry = TypedDict("Geometry", {"type": str, "coordinates": Any})
GeoJSONFeature = TypedDict(
    "GeoJSONFeature", {"type": str, "geometry": Geometry, "properties": dict}
)
GeoJSON = TypedDict("GeoJSON", {"features": list[GeoJSONFeature]})
# GeoJSON = geojson.FeatureCollection

WfsResponse = TypedDict("WfsResponse", {"filter_property_key": str, "path": FilePath})


class AcledRequest(BaseModel):
    iso: int
    limit: int
    fields: Optional[str]
    email: str
    key: str
    event_date: Optional[date]

    @root_validator(pre=True)
    def append_credentials(cls, values):
        api_key = getenv("ACLED_API_KEY", None)
        api_email = getenv("ACLED_API_EMAIL", None)

        filtered_values = {k: v for k, v in values.items() if v is not None}
        new_values = {**filtered_values, "email": api_email, "key": api_key}
        return new_values


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

    admin_level: Optional[int] = None
    geotiff_url: HttpUrl = Field(..., example=stats_data["geotiff_url"])
    zones_url: Optional[str] = Field(None, example=stats_data["zones_url"])
    group_by: Optional[str] = Field(None, example=stats_data["group_by"])
    wfs_params: Optional[WfsParamsModel] = None
    geojson_out: Optional[bool] = False
    zones: Optional[Any] = (
        None  # The GeoJSON types creates unexpected results by cutting off the properties
    )
    intersect_comparison: Optional[str] = None
    mask_url: Optional[str] = None
    mask_calc_expr: Optional[str] = None
    filter_by: Optional[FilterProperty] = None
    simplify_tolerance: Optional[float] = None

    @root_validator
    def check_zones_or_zones_url(cls, values):
        zones_url, zones = values.get("zones_url"), values.get("zones")
        if not zones_url and not zones:
            raise ValueError("Either zones_url or zones must be provided.")
        return values


class RasterGeotiffModel(BaseModel):
    """Schema for raster_geotiff data to be passed to /raster_geotiff endpoint."""

    collection: str
    date: Optional[str] = None
    band: Optional[str] = None
    lat_min: float
    long_min: float
    lat_max: float
    long_max: float
    filename_override: Optional[str] = None


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
    crs: Optional[dict] = Field(None, example=alert_data_zones["crs"])
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
    min: Optional[float] = None
    max: Optional[float] = None

    _val_alert_name = validator("alert_name", allow_reuse=True)(
        must_not_contain_null_char
    )
    _val_alert_config = validator("alert_config", allow_reuse=True)(
        dict_must_not_contain_null_char
    )

    @root_validator
    def check_min_max(cls, values):
        """Ensure at least one of 'min' or 'max' is set."""
        min_val, max_val = values.get("min"), values.get("max")
        if min_val is None and max_val is None:
            raise ValueError("At least one of 'min' or 'max' must be set")
        return values


class UserInfoPydanticModel(BaseModel):
    id: int
    username: str
    salt: str | None
    access: Any
    deployment: str | None
    organization: str | None
    email: str | None
    details: str
    created_at: datetime

    class Config:
        orm_mode = True


ExportFormat = Literal["pdf", "png"]


class MapExportRequestModel(BaseModel):
    """Schema for export request data to be passed to /export-map endpoint."""

    urls: list[str] = Field(
        ...,
        description="Map URLs containing all parameters necessary to render print view "
        "including layer ID(s), layer opacity, bounding box, legend config, etc.",
        example="/?hazardLayerIds=daily_rainfall_forecast&date=2025-01-01&layerOpacity=0.7&boundingBox=",
    )
    viewportWidth: int = Field(
        default=1200,
        ge=800,
        le=2400,
        description="Canvas width in pixels for rendering",
    )
    viewportHeight: int = Field(
        default=849,
        ge=400,
        le=2400,
        description="Canvas height in pixels for rendering",
    )
    format: ExportFormat = Field(
        ...,
        description="Output format: 'pdf' for merged PDF, 'png' for ZIP archive of PNGs",
        example="png",
    )

    @root_validator
    def validate_urls(cls, values):
        """Validate that the URL is from an allowed domain"""
        from prism_app.utils import validate_export_url

        urls = values.get("urls")
        if not urls:
            raise ValueError("URLs are required")
        for url in urls:
            try:
                validate_export_url(url)
            except ValueError as e:
                raise ValueError(f"Invalid URL: {url}. {str(e)}")
        return values
