"""Validate dashboard layout JSON stored in dashboard.config."""

from __future__ import annotations

from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, ValidationError

AggregationStat = Literal["max", "mean", "median", "min", "sum", "intersect_percentage"]
ChartHeight = Literal["tall", "medium", "short"]
MapPosition = Literal["left", "right"]


class PreSelectedMapLayer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    layerId: str
    opacity: float = Field(default=1.0, ge=0.0, le=1.0)


class DashboardMapConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["MAP"]
    defaultDate: str | None = None
    mapPosition: MapPosition | None = None
    minMapBounds: list[float] | None = None
    title: str | None = None
    legendVisible: bool = True
    legendPosition: MapPosition = "right"
    preSelectedMapLayers: list[PreSelectedMapLayer] = Field(default_factory=list)


class DashboardChartConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["CHART"]
    startDate: str
    endDate: str | None = None
    layerId: str
    adminUnitLevel: int | None = None
    adminUnitId: int | None = None
    chartHeight: ChartHeight = "tall"


class DashboardTextConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["TEXT"]
    content: str
    textUpdatedAt: str | None = None


class ThresholdDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    below: float | None = None
    above: float | None = None


class DashboardTableConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["TABLE"]
    startDate: str
    hazardLayerId: str
    baselineLayerId: str
    threshold: ThresholdDefinition | None = None
    stat: AggregationStat
    maxRows: int = 10
    addResultToMap: bool = True
    sortColumn: str | int = "name"
    sortOrder: Literal["asc", "desc"] = "asc"


DashboardElement = Annotated[
    Union[
        DashboardMapConfig,
        DashboardChartConfig,
        DashboardTextConfig,
        DashboardTableConfig,
    ],
    Field(discriminator="type"),
]


class DashboardConfigPayload(BaseModel):
    """Dashboard layout payload stored in ``dashboard.config``."""

    model_config = ConfigDict(extra="forbid")
    firstColumn: list[DashboardElement]
    secondColumn: list[DashboardElement] = Field(default_factory=list)
    thirdColumn: list[DashboardElement] = Field(default_factory=list)


_config_adapter: TypeAdapter[DashboardConfigPayload] = TypeAdapter(
    DashboardConfigPayload
)


def _validate_config_dict(obj: Any) -> dict[str, Any]:
    if not isinstance(obj, dict):
        raise ValueError("Dashboard config must be a JSON object.")
    try:
        config = _config_adapter.validate_python(obj)
    except ValidationError as e:
        raise ValueError(format_dashboard_config_validation_message(e)) from e
    # Keep output shape aligned with frontend Zod optional fields:
    # omit unset/None values instead of emitting explicit JSON nulls.
    return config.model_dump(mode="json", exclude_none=True)


def validate_and_dump_dashboard_config(raw: Any) -> dict[str, Any]:
    """
    Validate dashboard layout JSON for the ``dashboard.config`` column.
    Only the dashboard columns are persisted in config; model fields such as
    title and deployment are validated separately.
    """
    if raw is None:
        raise ValueError("Dashboard configuration is required.")
    return _validate_config_dict(raw)


def _error_location_phrase(loc: tuple[Any, ...]) -> str:
    """Short dotted path for the failing field (e.g. 0.pathdf, firstColumn.0.type)."""
    if not loc:
        return "root"
    return ".".join(str(x) for x in loc)


def format_dashboard_config_validation_message(
    exc: ValidationError,
) -> str:
    """
    One-line, end-user-friendly summary. Omits Pydantic URLs and long internal messages.
    Reports failing field locations (e.g. ``firstColumn.0.type``).
    """
    errors = list(exc.errors())
    n = len(errors)
    if n == 0:
        return "Invalid dashboard configuration."
    head = f"{n} validation error{'s' if n != 1 else ''} for dashboard config"
    max_show = 5
    parts: list[str] = []
    for err in errors[:max_show]:
        loc = err.get("loc") or ()
        if not isinstance(loc, tuple):
            loc = (loc,) if loc is not None else ()
        phrase = _error_location_phrase(loc)
        parts.append(f"'{phrase}'")
    out = f"{head}: {', '.join(parts)}"
    if n > max_show:
        out += f" (+{n - max_show} more)"
    return out
