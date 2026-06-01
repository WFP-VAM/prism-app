"""Starlette Admin views for scheduled map exports and jobs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from prism_app.admin import PrismGatedModelView, ReadOnlyModelView
from prism_app.auth.admin_request import (
    admin_user_from_request,
    request_has_prism_admin_access,
)
from prism_app.dashboard.dashboard_config_field import PrettyJSONField
from prism_app.database.map_export_job_model import MapExportJob
from prism_app.database.map_export_schedule_model import (
    MAX_DEKAD_INTERVAL,
    MapExportSchedule,
    MapExportScheduleCadence,
    MapExportScheduleFormat,
    MapExportScheduleStatus,
)
from prism_app.export_s3 import public_maps_folder_uri
from prism_app.export_schedules.routes import format_map_export_schedule_name
from prism_app.map_export_layer_catalog import (
    get_deployment_country,
    schedule_layer_choices_with_extra,
    schedule_layer_ids,
    schedule_layer_label,
)
from prism_app.utils import utc_now
from sqlalchemy import Select, cast, func, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.types import String
from starlette.exceptions import HTTPException
from starlette.requests import Request
from starlette.responses import Response
from starlette_admin import EnumField, StringField
from starlette_admin._types import RequestAction
from starlette_admin.actions import link_row_action
from starlette_admin.contrib.sqla import Admin
from starlette_admin.exceptions import FormValidationError


def _apply_schedule_owner_filter(stmt: Select, request: Request) -> Select:
    if request_has_prism_admin_access(request):
        return stmt
    user_id = admin_user_from_request(request).id
    return stmt.where(MapExportSchedule.created_by_user_id == user_id)


def _apply_job_owner_filter(stmt: Select, request: Request) -> Select:
    if request_has_prism_admin_access(request):
        return stmt
    user_id = admin_user_from_request(request).id
    return stmt.where(MapExportJob.created_by_user_id == user_id)


def _schedule_country_for_request(request: Request) -> str:
    country = get_deployment_country()
    pk = request.path_params.get("pk")
    if pk:
        session: Session = request.state.session
        row = session.get(MapExportSchedule, pk)
        if row is not None and row.country:
            return row.country
    clone_from = request.query_params.get("clone_from")
    if clone_from:
        session = request.state.session
        row = session.get(MapExportSchedule, clone_from)
        if row is not None and row.country:
            return row.country
    return country


def _layer_id_choices(request: Request) -> list[tuple[str, str]]:
    country = _schedule_country_for_request(request)
    extra: tuple[str, ...] = ()
    pk = request.path_params.get("pk")
    if pk:
        session: Session = request.state.session
        row = session.get(MapExportSchedule, pk)
        if row is not None and row.layer_id:
            extra = (row.layer_id,)
    return list(schedule_layer_choices_with_extra(country, extra_layer_ids=extra))


def _parse_cadence(value: Any) -> MapExportScheduleCadence:
    if isinstance(value, MapExportScheduleCadence):
        return value
    return MapExportScheduleCadence(str(value))


def _parse_format(value: Any) -> str:
    if isinstance(value, MapExportScheduleFormat):
        return value.value
    return str(value).lower()


def _set_admin_action(request: Request, action: RequestAction) -> None:
    """``find_by_pk`` / ``serialize`` expect ``request.state.action`` (set on normal admin routes)."""
    request.state.action = action


def _normalize_dekad_interval(
    cadence: MapExportScheduleCadence,
    dekad_interval: int,
) -> int:
    if cadence != MapExportScheduleCadence.every_n_dekads:
        return 1
    return max(1, min(MAX_DEKAD_INTERVAL, int(dekad_interval)))


def _validate_dekad_interval(
    cadence: MapExportScheduleCadence,
    dekad_interval: int,
) -> str | None:
    if cadence != MapExportScheduleCadence.every_n_dekads:
        return None
    if dekad_interval < 1 or dekad_interval > MAX_DEKAD_INTERVAL:
        return f"Dekad interval must be between 1 and {MAX_DEKAD_INTERVAL}"
    return None


def _last_executed_at_by_schedule_ids(
    session: Session,
    schedule_ids: list[UUID],
) -> dict[UUID, Any]:
    if not schedule_ids:
        return {}
    rows = session.execute(
        select(
            MapExportJob.map_export_schedule_id,
            func.max(MapExportJob.finished_at),
        )
        .where(
            MapExportJob.map_export_schedule_id.in_(schedule_ids),
            MapExportJob.status == "succeeded",
        )
        .group_by(MapExportJob.map_export_schedule_id),
    ).all()
    return {row[0]: row[1] for row in rows}


def _enrich_schedules_for_admin(
    session: Session,
    schedules: list[MapExportSchedule],
) -> None:
    last_executed = _last_executed_at_by_schedule_ids(
        session,
        [s.id for s in schedules],
    )
    for item in schedules:
        item._admin_last_executed_at = last_executed.get(item.id)  # noqa: SLF001
        if item.export_url and item.country:
            try:
                item._admin_output_directory = public_maps_folder_uri(  # noqa: SLF001
                    item.export_url,
                    country=item.country,
                )
            except ValueError:
                item._admin_output_directory = None  # noqa: SLF001
        else:
            item._admin_output_directory = None  # noqa: SLF001


@dataclass
class ScheduleLastExecutedField(StringField):
    exclude_from_create = True
    exclude_from_edit = True
    searchable = False
    orderable = False

    async def parse_obj(self, request: Request, obj: Any) -> Any:  # noqa: ARG002
        return getattr(obj, "_admin_last_executed_at", None)

    async def serialize_value(
        self,
        request: Request,
        value: Any,
        action: RequestAction,
    ) -> Any:
        _ = request, action
        if value is None:
            return None
        if hasattr(value, "strftime"):
            return value.strftime("%Y-%m-%d %H:%M UTC")
        return str(value)


@dataclass
class ScheduleLayerIdField(EnumField):
    """Layer id with labels resolved from the schedule's country"""

    async def parse_obj(self, request: Request, obj: Any) -> Any:  # noqa: ARG002
        layer_id = getattr(obj, "layer_id", None)
        country = getattr(obj, "country", None) or get_deployment_country()
        return layer_id, country

    async def serialize_value(
        self,
        request: Request,
        value: Any,
        action: RequestAction,
    ) -> Any:
        _ = request
        if value is None:
            return None
        if isinstance(value, tuple) and len(value) == 2:
            layer_id, country = value
        else:
            layer_id, country = value, get_deployment_country()
        if action == RequestAction.EDIT:
            return layer_id
        return schedule_layer_label(country, layer_id)


@dataclass
class MapExportOutputDirectoryField(StringField):
    exclude_from_create = True
    exclude_from_edit = True
    searchable = False
    orderable = False

    async def parse_obj(self, request: Request, obj: Any) -> Any:  # noqa: ARG002
        return getattr(obj, "_admin_output_directory", None)


class PrismAdmin(Admin):
    """Admin with clone-prefill support for map export schedules."""

    async def _render_create(self, request: Request) -> Response:
        if request.method == "GET" and (
            clone_from := request.query_params.get("clone_from")
        ):
            identity = request.path_params.get("identity")
            model = self._find_model_from_identity(identity)
            if isinstance(model, MapExportScheduleView):
                _set_admin_action(request, RequestAction.CREATE)
                source = await model.find_by_pk(request, clone_from)
                if source is None:
                    raise HTTPException(status_code=404)
                return self.templates.TemplateResponse(
                    request=request,
                    name=model.create_template,
                    context={
                        "title": model.title(request),
                        "model": model,
                        "obj": await model.serialize_clone_prefill(source, request),
                    },
                )
        return await super()._render_create(request)


class MapExportScheduleView(PrismGatedModelView):
    label = "Map export schedules"
    create_template = "map_export_schedule_create.html"
    edit_template = "map_export_schedule_edit.html"
    fields = (
        "name",
        EnumField("status", enum=MapExportScheduleStatus),
        "country",
        ScheduleLayerIdField(
            "layer_id",
            label="Layer",
            choices_loader=_layer_id_choices,
        ),
        StringField("admin_areas", label="Admin areas", read_only=True),
        EnumField("cadence", enum=MapExportScheduleCadence),
        "dekad_interval",
        EnumField("format", enum=MapExportScheduleFormat),
        ScheduleLastExecutedField("last_executed_at", label="Last executed"),
        MapExportOutputDirectoryField(
            "output_directory",
            label="Output location",
        ),
        StringField("export_url", read_only=True),
        PrettyJSONField("export_options", read_only=True),
        "created_by_user_id",
        "created_at",
        "updated_at",
    )
    exclude_fields_from_list = ("export_options", "export_url", "dekad_interval")
    exclude_fields_from_create = (
        "id",
        "country",
        "admin_areas",
        "export_url",
        "export_options",
        "last_checked_at",
        "last_enqueued_at",
        "last_enqueued_date",
        "last_executed_at",
        "output_directory",
        "created_by_user_id",
        "created_at",
        "updated_at",
    )
    exclude_fields_from_edit = (
        "id",
        "admin_areas",
        "export_url",
        "export_options",
        "last_checked_at",
        "last_enqueued_at",
        "last_enqueued_date",
        "last_executed_at",
        "output_directory",
        "created_by_user_id",
        "created_at",
        "updated_at",
        "country",
    )
    searchable_fields = ("name", "layer_id", "status", "country", "admin_areas")
    sortable_fields = (
        "name",
        "status",
        "layer_id",
        "admin_areas",
        "cadence",
        "last_enqueued_at",
        "created_at",
    )
    fields_default_sort = [("created_at", True)]
    actions: list[str] = []
    row_actions = ["view", "edit", "clone", "delete"]

    def can_create(self, request: Request) -> bool:
        if not super().can_create(request):
            return False
        return "clone_from" in request.query_params

    def get_list_query(self, request: Request) -> Select:
        return _apply_schedule_owner_filter(super().get_list_query(request), request)

    def get_count_query(self, request: Request) -> Select:
        return _apply_schedule_owner_filter(super().get_count_query(request), request)

    def get_details_query(self, request: Request) -> Select:
        return _apply_schedule_owner_filter(super().get_details_query(request), request)

    def get_search_query(self, request: Request, term: str) -> Any:
        """Case-insensitive search (explicit lower() for portability)."""
        _ = request
        term_lower = term.strip().lower()
        if not term_lower:
            return None
        clauses = []
        for field_name in self.searchable_fields:
            attr = getattr(self.model, field_name, None)
            if attr is None:
                continue
            clauses.append(
                func.lower(cast(attr, String)).contains(term_lower),
            )
        return or_(*clauses) if clauses else None

    async def find_all(
        self,
        request: Request,
        skip: int = 0,
        limit: int = 100,
        where: Any = None,
        order_by: list[str] | None = None,
    ) -> Any:
        items = await super().find_all(
            request,
            skip=skip,
            limit=limit,
            where=where,
            order_by=order_by,
        )
        if not items:
            return items
        _enrich_schedules_for_admin(request.state.session, list(items))
        return items

    async def find_by_pk(self, request: Request, pk: Any) -> Any:
        item = await super().find_by_pk(request, pk)
        if item is None:
            return None
        if getattr(request.state, "action", None) == RequestAction.CREATE:
            return item
        _enrich_schedules_for_admin(request.state.session, [item])
        return item

    async def _load_clone_source(
        self,
        request: Request,
        clone_from: str,
    ) -> MapExportSchedule:
        """Load source schedule without flushing the pending create row."""
        _set_admin_action(request, RequestAction.CREATE)
        session: Session = request.state.session
        with session.no_autoflush:
            source = await self.find_by_pk(request, clone_from)
        if source is None:
            raise FormValidationError(
                {"__all__": "Source schedule not found or not accessible"},
            )
        if not source.export_url or not source.export_options:
            raise FormValidationError(
                {"__all__": "Source schedule is missing export configuration"},
            )
        return source

    async def serialize_clone_prefill(
        self,
        source: MapExportSchedule,
        request: Request,
    ) -> dict[str, Any]:
        serialized = await self.serialize(source, request, RequestAction.CREATE)
        serialized.pop("id", None)
        serialized["name"] = f"{source.name} (clone)"
        serialized["layer_id"] = ""
        serialized["cadence"] = ""
        serialized["dekad_interval"] = source.dekad_interval
        serialized["last_checked_at"] = None
        serialized["last_enqueued_at"] = None
        serialized["last_enqueued_date"] = None
        serialized["created_by_user_id"] = None
        return serialized

    @link_row_action(
        name="clone",
        text="Clone",
        icon_class="fa-solid fa-copy",
        action_btn_class="btn-secondary",
    )
    def clone_row_action(self, request: Request, pk: Any) -> str:
        route_name = request.app.state.ROUTE_NAME
        base = str(
            request.url_for(route_name + ":create", identity=self.identity),
        )
        return f"{base}?clone_from={pk}"

    async def validate(self, request: Request, data: dict[str, Any]) -> None:
        errors: dict[str, str] = {}
        country = _schedule_country_for_request(request)
        layer_id = data.get("layer_id")
        if not layer_id:
            errors["layer_id"] = "Layer is required"
        elif layer_id not in schedule_layer_ids(country):
            errors["layer_id"] = f"Layer is not valid for {country}"
        if not data.get("cadence"):
            errors["cadence"] = "Cadence is required"
        cadence_raw = data.get("cadence")
        if cadence_raw:
            cadence = _parse_cadence(cadence_raw)
            dekad_raw = data.get("dekad_interval")
            try:
                dekad_val = int(dekad_raw) if dekad_raw not in (None, "") else 1
            except (TypeError, ValueError):
                errors["dekad_interval"] = "Dekad interval must be a number"
                dekad_val = 1
            dekad_error = _validate_dekad_interval(cadence, dekad_val)
            if dekad_error:
                errors["dekad_interval"] = dekad_error
        if errors:
            raise FormValidationError(errors)
        await super().validate(request, data)

    async def before_create(
        self,
        request: Request,
        data: dict[str, Any],
        obj: MapExportSchedule,
    ) -> None:
        clone_from = request.query_params.get("clone_from")
        if clone_from:
            source = await self._load_clone_source(request, clone_from)
            obj.export_url = source.export_url
            obj.export_options = source.export_options
            obj.admin_areas = source.admin_areas

        user = admin_user_from_request(request)
        country = get_deployment_country()
        obj.country = country
        obj.created_by_user_id = user.id
        cadence = _parse_cadence(data.get("cadence") or obj.cadence)
        obj.dekad_interval = _normalize_dekad_interval(
            cadence,
            int(data.get("dekad_interval") or obj.dekad_interval or 1),
        )
        layer_id = str(data.get("layer_id") or obj.layer_id)
        export_format = _parse_format(data.get("format") or obj.format)
        obj.format = MapExportScheduleFormat(export_format)
        submitted_name = str(data.get("name") or obj.name or "").strip()
        obj.name = submitted_name or format_map_export_schedule_name(
            country=country,
            layer_id=layer_id,
            cadence=cadence,
            format=export_format,
        )

    async def before_edit(
        self,
        request: Request,
        data: dict[str, Any],
        obj: MapExportSchedule,
    ) -> None:
        _ = request
        cadence = _parse_cadence(data.get("cadence") or obj.cadence)
        obj.dekad_interval = _normalize_dekad_interval(
            cadence,
            int(data.get("dekad_interval") or obj.dekad_interval or 1),
        )
        layer_id = str(data.get("layer_id") or obj.layer_id)
        export_format = _parse_format(data.get("format") or obj.format)
        obj.format = MapExportScheduleFormat(export_format)
        submitted_name = str(data.get("name") or obj.name or "").strip()
        obj.name = submitted_name or format_map_export_schedule_name(
            country=obj.country,
            layer_id=layer_id,
            cadence=cadence,
            format=export_format,
        )
        obj.updated_at = utc_now()


class MapExportJobView(ReadOnlyModelView):
    label = "Map export jobs"
    exclude_fields_from_list = ("request_payload_json", "error_json")
    searchable_fields = ("status", "map_export_schedule_id")
    sortable_fields = ("status", "priority", "created_at", "finished_at")
    fields_default_sort = [("created_at", True)]

    def get_list_query(self, request: Request) -> Select:
        return _apply_job_owner_filter(super().get_list_query(request), request)

    def get_count_query(self, request: Request) -> Select:
        return _apply_job_owner_filter(super().get_count_query(request), request)

    def get_details_query(self, request: Request) -> Select:
        return _apply_job_owner_filter(super().get_details_query(request), request)


def register_map_export_admin_views(admin: Admin) -> None:
    admin.add_view(MapExportScheduleView(MapExportSchedule))
    # TODO: do we want to view these in admin?
    # admin.add_view(MapExportJobView(MapExportJob))
