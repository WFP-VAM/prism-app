"""Starlette Admin views for scheduled map exports and jobs."""

from __future__ import annotations

from typing import Any

from prism_app.admin import PrismGatedModelView, ReadOnlyModelView
from prism_app.auth.admin_request import (
    admin_user_from_request,
    request_has_prism_admin_access,
)
from prism_app.database.map_export_job_model import MapExportJob
from prism_app.database.map_export_schedule_model import (
    MapExportSchedule,
    MapExportScheduleCadence,
    MapExportScheduleStatus,
)
from prism_app.export_schedules.routes import format_map_export_schedule_name
from prism_app.map_export_layer_catalog import (
    get_deployment_country,
    schedule_layer_choices,
    schedule_layer_ids,
)
from sqlalchemy import Select
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException
from starlette.requests import Request
from starlette.responses import Response
from starlette_admin import EnumField, JSONField, StringField
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


def _layer_id_choices(request: Request) -> list[tuple[str, str]]:
    _ = request
    return list(schedule_layer_choices(get_deployment_country()))


def _parse_cadence(value: Any) -> MapExportScheduleCadence:
    if isinstance(value, MapExportScheduleCadence):
        return value
    return MapExportScheduleCadence(str(value))


def _set_admin_action(request: Request, action: RequestAction) -> None:
    """``find_by_pk`` / ``serialize`` expect ``request.state.action`` (set on normal admin routes)."""
    request.state.action = action


def _normalize_dekad_interval(
    cadence: MapExportScheduleCadence,
    dekad_interval: int,
) -> int:
    if cadence != MapExportScheduleCadence.every_n_dekads:
        return 1
    return dekad_interval


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
        EnumField(
            "layer_id",
            label="Layer",
            choices_loader=_layer_id_choices,
        ),
        EnumField("cadence", enum=MapExportScheduleCadence),
        "format",
        StringField("export_url", read_only=True),
        JSONField("export_options", read_only=True),
        "created_by_user_id",
        "created_at",
        "updated_at",
    )
    exclude_fields_from_list = ("export_options", "export_url")
    exclude_fields_from_create = (
        "id",
        "country",
        "export_url",
        "export_options",
        "last_checked_at",
        "last_enqueued_at",
        "last_enqueued_date",
        "created_by_user_id",
        "created_at",
        "updated_at",
    )
    exclude_fields_from_edit = (
        "id",
        "export_url",
        "export_options",
        "last_checked_at",
        "last_enqueued_at",
        "last_enqueued_date",
        "created_by_user_id",
        "created_at",
        "updated_at",
        "country",
    )
    searchable_fields = ("name", "layer_id", "status", "country")
    sortable_fields = (
        "name",
        "status",
        "layer_id",
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
        layer_id = data.get("layer_id")
        if not layer_id:
            errors["layer_id"] = "Layer is required"
        elif layer_id not in schedule_layer_ids():
            errors["layer_id"] = "Layer is not valid for this deployment"
        if not data.get("cadence"):
            errors["cadence"] = "Cadence is required"
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
        export_format = str(data.get("format") or obj.format)
        obj.name = format_map_export_schedule_name(
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
        export_format = str(data.get("format") or obj.format)
        obj.name = format_map_export_schedule_name(
            country=obj.country,
            layer_id=layer_id,
            cadence=cadence,
            format=export_format,
        )


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
