import json
from datetime import date, datetime
from os import getenv
from typing import Any, Literal, NewType, Optional, TypedDict

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    HttpUrl,
    field_validator,
    model_validator,
)

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
    model_config = ConfigDict(extra="ignore")

    iso: int
    limit: int
    fields: Optional[str] = None
    email: str
    key: str
    event_date: Optional[date] = None

    @model_validator(mode="before")
    @classmethod
    def append_credentials(cls, data: Any):
        if not isinstance(data, dict):
            return data
        api_key = getenv("ACLED_API_KEY", None)
        api_email = getenv("ACLED_API_EMAIL", None)
        filtered = {k: v for k, v in data.items() if v is not None}
        return {**filtered, "email": api_email, "key": api_key}


class WfsParamsModel(BaseModel):
    key: str = Field(..., examples=["label"])
    layer_name: str = Field(..., examples=["mmr_gdacs_buffers"])
    time: str = Field(..., examples=["2022-05-11"])
    url: HttpUrl = Field(..., examples=["https://geonode.wfp.org/geoserver/ows"])


class FilterProperty(BaseModel):
    key: str = Field(..., examples=["Adm2_Name"])
    value: str = Field(..., examples=["Barranquilla"])


class StatsModel(BaseModel):
    """Schema for stats data to be passed to /stats endpoint."""

    admin_level: Optional[int] = None
    geotiff_url: HttpUrl = Field(..., examples=[stats_data["geotiff_url"]])
    zones_url: Optional[str] = Field(None, examples=[stats_data["zones_url"]])
    group_by: Optional[str] = Field(None, examples=[stats_data["group_by"]])
    wfs_params: Optional[WfsParamsModel] = None
    geojson_out: Optional[bool] = False
    zones: Optional[Any] = None
    intersect_comparison: Optional[str] = None
    mask_url: Optional[str] = None
    mask_calc_expr: Optional[str] = None
    filter_by: Optional[FilterProperty] = None
    simplify_tolerance: Optional[float] = None

    @model_validator(mode="after")
    def check_zones_or_zones_url(self):
        if not self.zones_url and not self.zones:
            raise ValueError("Either zones_url or zones must be provided.")
        return self


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


class AlertsZonesModel(BaseModel):
    """Schema of the zones argument for alerts."""

    type: str = Field(..., examples=[alert_data_zones["type"]])
    name: str = Field(..., examples=[alert_data_zones["name"]])
    crs: Optional[dict] = Field(None, examples=[alert_data_zones["crs"]])
    features: dict | list[dict] = Field(..., examples=[alert_data_zones["features"]])

    @field_validator("type")
    @classmethod
    def val_type(cls, v: str) -> str:
        return must_not_contain_null_char(v)

    @field_validator("name")
    @classmethod
    def val_name(cls, v: str) -> str:
        return must_not_contain_null_char(v)

    @field_validator("crs")
    @classmethod
    def val_crs(cls, v: Optional[dict]) -> Optional[dict]:
        if v is not None:
            dict_must_not_contain_null_char(v)
        return v

    @field_validator("features")
    @classmethod
    def val_features(cls, v: dict | list[dict]) -> dict | list[dict]:
        must_not_contain_null_char(json.dumps(v))
        return v


class AlertsModel(BaseModel):
    """Example of alert data for validation by pydantic."""

    email: EmailStr = Field(..., examples=[alert_data["email"]])
    prism_url: HttpUrl = Field(..., examples=[alert_data["prism_url"]])
    alert_name: str = Field(..., examples=[alert_data["alert_name"]])
    alert_config: dict = Field(..., examples=[alert_data["alert_config"]])
    zones: AlertsZonesModel
    min: Optional[float] = None
    max: Optional[float] = None

    @field_validator("alert_name")
    @classmethod
    def val_alert_name(cls, v: str) -> str:
        return must_not_contain_null_char(v)

    @field_validator("alert_config")
    @classmethod
    def val_alert_config(cls, v: dict) -> dict:
        return dict_must_not_contain_null_char(v)

    @model_validator(mode="after")
    def check_min_max(self):
        if self.min is None and self.max is None:
            raise ValueError("At least one of 'min' or 'max' must be set")
        return self


ExportFormat = Literal["pdf", "png"]


class MapExportRequestModel(BaseModel):
    """Schema for export request data to be passed to /export-map endpoint."""

    urls: list[str] = Field(
        ...,
        description="Map URLs containing all parameters necessary to render print view "
        "including layer ID(s), layer opacity, bounding box, legend config, etc.",
        examples=[
            [
                "/?hazardLayerIds=daily_rainfall_forecast&date=2025-01-01&layerOpacity=0.7&boundingBox="
            ]
        ],
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
        examples=["png"],
    )

    @model_validator(mode="after")
    def validate_urls(self):
        from prism_app.utils import validate_export_url

        if not self.urls:
            raise ValueError("URLs are required")
        for url in self.urls:
            try:
                validate_export_url(url)
            except ValueError as e:
                raise ValueError(f"Invalid URL: {url}. {str(e)}") from e
        return self
