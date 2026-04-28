"""Validate dashboard JSON for storage (same top-level array shape as static dashboard.json)."""

from __future__ import annotations

from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, ValidationError

from prism_app.dashboard_slug import slugify_dashboard_name

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
    Union[DashboardMapConfig, DashboardChartConfig, DashboardTextConfig, DashboardTableConfig],
    Field(discriminator="type"),
]


class DashboardConfigPayload(BaseModel):
    """One object from the top-level `dashboard.json` array."""

    model_config = ConfigDict(extra="forbid")

    title: str
    path: str | None = None
    isEditable: bool = False
    firstColumn: list[DashboardElement]
    secondColumn: list[DashboardElement] = Field(default_factory=list)
    thirdColumn: list[DashboardElement] = Field(default_factory=list)


_row_adapter: TypeAdapter[DashboardConfigPayload] = TypeAdapter(DashboardConfigPayload)


def _apply_default_path(dumped: dict[str, Any]) -> None:
    path_val = (dumped.get("path") or "").strip() if isinstance(dumped.get("path"), str) else ""
    if not path_val:
        dumped["path"] = slugify_dashboard_name(dumped["title"])


def _validate_one_row_dict(obj: Any, row_index: int | None = None) -> dict[str, Any]:
    if not isinstance(obj, dict):
        raise ValueError("Each dashboard in the array must be a JSON object.")
    try:
        row = _row_adapter.validate_python(obj)
    except ValidationError as e:
        raise ValueError(
            format_dashboard_config_validation_message(e, row_index=row_index)
        ) from e
    # Keep output shape aligned with frontend Zod optional fields:
    # omit unset/None values instead of emitting explicit JSON nulls.
    out = row.model_dump(mode="json", exclude_none=True)
    _apply_default_path(out)
    return out


def validate_and_dump_dashboard_config(raw: Any) -> list[dict[str, Any]]:
    """
    Validate the same top-level shape as the frontend: a JSON array of dashboard rows, or
    a single object (wrapped as a one-element list for storage consistency).

    Returns a list of row dicts suitable for JSONB (matches ``dashboard.json`` on disk).
    """
    if raw is None:
        raise ValueError("Dashboard configuration is required.")
    if isinstance(raw, list):
        if len(raw) == 0:
            raise ValueError("Dashboard configuration must contain at least one dashboard.")
        return [
            _validate_one_row_dict(item, row_index=i) for i, item in enumerate(raw)
        ]
    if isinstance(raw, dict):
        return [_validate_one_row_dict(raw, row_index=0)]
    raise ValueError("Dashboard config must be a JSON object or a non-empty JSON array.")


def _error_location_phrase(loc: tuple[Any, ...]) -> str:
    """Short dotted path for the failing field (e.g. 0.pathdf, firstColumn.0.type)."""
    if not loc:
        return "root"
    return ".".join(str(x) for x in loc)


def format_dashboard_config_validation_message(
    exc: ValidationError, row_index: int | None = None
) -> str:
    """
    One-line, end-user-friendly summary. Omits Pydantic URLs and long internal messages.
    If ``row_index`` is set (when validating a row inside a top-level array), it is
    prepended to each location (e.g. ``0.isEditabledd``).
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
        if row_index is not None:
            phrase = f"{row_index}.{phrase}" if phrase != "root" else str(row_index)
        parts.append(f"'{phrase}'")
    out = f"{head}: {', '.join(parts)}"
    if n > max_show:
        out += f" (+{n - max_show} more)"
    return out
