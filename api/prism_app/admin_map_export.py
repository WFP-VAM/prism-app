"""Starlette Admin views for scheduled map exports and jobs."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from json import JSONDecodeError
from typing import Any, Callable, Dict, Optional, Sequence
from uuid import UUID

from prism_app.admin import PrismGatedModelView, ReadOnlyModelView
from prism_app.auth.admin_request import (
    admin_user_from_request,
    request_can_manage_map_exports,
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
from prism_app.database.user_model import User
from prism_app.export_jobs.schedule_download import (
    SCHEDULE_DOWNLOAD_UNAVAILABLE_MSG,
    latest_succeeded_job_for_schedule,
    schedule_export_download_response,
    schedule_ids_with_downloadable_export,
)
from prism_app.export_schedules.routes import format_map_export_schedule_name
from prism_app.map_export_layer_catalog import (
    get_deployment_country,
    schedule_layer_choices_with_extra,
    schedule_layer_ids,
    schedule_layer_label,
)
from prism_app.utils import utc_now
from sqlalchemy import Select, and_, cast, func, or_, select
from sqlalchemy.orm import InstrumentedAttribute, Session, joinedload
from sqlalchemy.sql import ClauseElement
from sqlalchemy.types import String
from starlette.exceptions import HTTPException
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.status import HTTP_403_FORBIDDEN
from starlette_admin import EnumField, HasOne, StringField
from starlette_admin._types import RequestAction
from starlette_admin.actions import action, link_row_action, row_action
from starlette_admin.contrib.sqla import Admin
from starlette_admin.contrib.sqla.helpers import OPERATORS
from starlette_admin.exceptions import ActionFailed, FormValidationError
from starlette_admin.fields import BaseField
from starlette_admin.i18n import ngettext

_DEFAULT_EQ = OPERATORS["eq"]
_DEFAULT_NEQ = OPERATORS["neq"]

# Starlette-admin batch actions take pre-rendered HTML for ``form``, not a template
# path. The list page embeds this string in each action link's ``data-form``
# attribute; client JS copies it into the confirmation modal on click. Unlike
# create/edit/list pages, there is no request-time TemplateResponse hook for it.
_BULK_UPDATE_STATUS_FORM = """
<form>
    <div class="mt-3">
        <label class="form-label" for="bulk-status">Status</label>
        <select id="bulk-status" class="form-select" name="status" required>
            <option value="">Select status…</option>
            <option value="active">Active</option>
            <option value="stopped">Stopped</option>
        </select>
    </div>
</form>
"""

_CASE_INSENSITIVE_STRING_OPERATORS: Dict[str, Callable[..., ClauseElement]] = {
    **OPERATORS,
    "eq": lambda f, v: (
        _DEFAULT_EQ(f, v)
        if v is None
        else func.lower(cast(f, String)) == str(v).lower()
    ),
    "neq": lambda f, v: (
        _DEFAULT_NEQ(f, v)
        if v is None
        else func.lower(cast(f, String)) != str(v).lower()
    ),
    "startswith": lambda f, v: func.lower(cast(f, String)).startswith(str(v).lower()),
    "not_startswith": lambda f, v: ~func.lower(cast(f, String)).startswith(
        str(v).lower(),
    ),
    "endswith": lambda f, v: func.lower(cast(f, String)).endswith(str(v).lower()),
    "not_endswith": lambda f, v: ~func.lower(cast(f, String)).endswith(str(v).lower()),
    "contains": lambda f, v: func.lower(cast(f, String)).contains(str(v).lower()),
    "not_contains": lambda f, v: ~func.lower(cast(f, String)).contains(str(v).lower()),
    "in": lambda f, v: func.lower(cast(f, String)).in_(
        [str(item).lower() for item in v],
    ),
    "not_in": lambda f, v: ~func.lower(cast(f, String)).in_(
        [str(item).lower() for item in v],
    ),
}


def _case_insensitive_build_query(
    where: Dict[str, Any],
    model: Any,
    latest_attr: Optional[InstrumentedAttribute] = None,
) -> Any:
    """Like ``build_query`` but case-insensitive for string comparison operators."""
    filters = []
    for key, _ in where.items():
        if key == "or":
            filters.append(
                or_(
                    *[
                        _case_insensitive_build_query(item, model, latest_attr)
                        for item in where[key]
                    ],
                ),
            )
        elif key == "and":
            filters.append(
                and_(
                    *[
                        _case_insensitive_build_query(item, model, latest_attr)
                        for item in where[key]
                    ],
                ),
            )
        elif key in _CASE_INSENSITIVE_STRING_OPERATORS:
            filters.append(
                _CASE_INSENSITIVE_STRING_OPERATORS[key](latest_attr, where[key]),
            )
        else:
            attr: Optional[InstrumentedAttribute] = getattr(model, key, None)
            if attr is not None:
                filters.append(
                    _case_insensitive_build_query(where[key], model, attr),
                )
    if len(filters) == 1:
        return filters[0]
    if filters:
        return and_(*filters)
    return and_(True)


class CaseInsensitiveColumnFilterMixin:
    """Use case-insensitive string matching for SearchBuilder column filters."""

    def _coerce_list_where(self, where: Any) -> Any:
        """Turn SearchBuilder JSON into a clause; leave global search strings as-is."""
        if isinstance(where, dict):
            return _case_insensitive_build_query(where, self.model)
        return where

    async def build_full_text_search_query(
        self,
        request: Request,
        term: Any,
        model: Any,
    ) -> Any:
        # ModelView routes non-dict ``where`` here; accept pre-built clauses from
        # ``_coerce_list_where`` so ``find_all`` / ``count`` can delegate to super().
        if isinstance(term, ClauseElement):
            return term
        return await super().build_full_text_search_query(request, term, model)

    async def count(
        self,
        request: Request,
        where: Any = None,
    ) -> int:
        return await super().count(request, where=self._coerce_list_where(where))

    async def find_all(
        self,
        request: Request,
        skip: int = 0,
        limit: int = 100,
        where: Any = None,
        order_by: list[str] | None = None,
    ) -> Any:
        return await super().find_all(
            request,
            skip=skip,
            limit=limit,
            where=self._coerce_list_where(where),
            order_by=order_by,
        )


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


class PrismAdmin(Admin):
    """Admin with clone-prefill support for map export schedules."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        if "templates_dir" not in kwargs:
            kwargs["templates_dir"] = os.path.join(
                os.path.dirname(__file__), "templates"
            )
        super().__init__(*args, **kwargs)

    async def _render_api(self, request: Request) -> Response:
        identity = request.path_params.get("identity")
        model = self._find_model_from_identity(identity)
        if not model.is_accessible(request):
            return JSONResponse(None, status_code=HTTP_403_FORBIDDEN)
        skip = int(request.query_params.get("skip") or "0")
        limit = int(request.query_params.get("limit") or "100")
        order_by = request.query_params.getlist("order_by")
        where = request.query_params.get("where")
        pks = request.query_params.getlist("pks")
        select2 = "select2" in request.query_params
        request.state.action = RequestAction.API if select2 else RequestAction.LIST
        if len(pks) > 0:
            items = await model.find_by_pks(request, pks)
            total = len(items)
        else:
            if where is not None:
                try:
                    where = json.loads(where)
                except JSONDecodeError:
                    where = str(where)
            items = await model.find_all(
                request=request,
                skip=skip,
                limit=limit,
                where=where,
                order_by=order_by,
            )
            total = await model.count(request=request, where=where)
        serialized_items = [
            (
                await model.serialize(
                    item,
                    request,
                    RequestAction.API if select2 else RequestAction.LIST,
                    include_relationships=not select2,
                    include_select2=select2,
                )
            )
            for item in items
        ]

        if not select2:
            row_actions = await model.get_all_row_actions(request)
            assert model.pk_attr
            download_available_by_pk: dict[str, bool] = {}
            if isinstance(model, MapExportScheduleView):
                session: Session = request.state.session
                schedule_ids = [
                    model._schedule_pk_as_uuid(serialized_item[model.pk_attr])
                    for serialized_item in serialized_items
                ]
                available = schedule_ids_with_downloadable_export(
                    session,
                    schedule_ids,
                )
                download_available_by_pk = {
                    str(schedule_id): schedule_id in available
                    for schedule_id in schedule_ids
                }
            for serialized_item in serialized_items:
                pk = serialized_item[model.pk_attr]
                if isinstance(model, MapExportScheduleView):
                    serialized_item["_meta"]["rowActions"] = (
                        model.render_row_actions_html(
                            templates=self.templates,
                            request=request,
                            pk=pk,
                            actions=row_actions,
                            download_available=download_available_by_pk.get(
                                str(pk),
                                False,
                            ),
                        )
                    )
                else:
                    serialized_item["_meta"][
                        "rowActions"
                    ] = self.templates.get_template("row-actions.html").render(
                        _actions=row_actions,
                        display_type=model.row_actions_display_type,
                        pk=pk,
                        request=request,
                        model=model,
                    )

        return JSONResponse(
            {
                "items": serialized_items,
                "total": total,
            }
        )

    async def _render_detail(self, request: Request) -> Response:
        request.state.action = RequestAction.DETAIL
        identity = request.path_params.get("identity")
        model = self._find_model_from_identity(identity)
        if not model.is_accessible(request) or not model.can_view_details(request):
            raise HTTPException(status_code=HTTP_403_FORBIDDEN)
        pk = request.path_params.get("pk")
        obj = await model.find_by_pk(request, pk)
        if obj is None:
            raise HTTPException(status_code=404)
        context: dict[str, Any] = {
            "title": model.title(request),
            "model": model,
            "raw_obj": obj,
            "_actions": await model.get_all_row_actions(request),
            "obj": await model.serialize(obj, request, RequestAction.DETAIL),
        }
        if isinstance(model, MapExportScheduleView):
            context["download_available"] = await model.schedule_download_available(
                request,
                obj.id,
            )
        return self.templates.TemplateResponse(
            request=request,
            name=model.detail_template,
            context=context,
        )

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


class MapExportScheduleView(CaseInsensitiveColumnFilterMixin, PrismGatedModelView):
    label = "Map export schedules"
    list_template = "map_export_schedule_list.html"
    detail_template = "map_export_schedule_detail.html"
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
        StringField("export_url", read_only=True),
        PrettyJSONField("export_options", read_only=True),
        HasOne("created_by_user", label="Scheduled by", identity="user"),
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
        "created_by_user",
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
        "created_by_user",
        "created_at",
        "updated_at",
        "country",
    )
    searchable_fields = (
        "name",
        "layer_id",
        "status",
        "country",
        "admin_areas",
        "cadence",
        "format",
    )
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
    actions = ["update_status", "delete"]
    row_actions = ["view", "edit", "clone", "download", "delete"]

    _ADMIN_ONLY_FIELD_NAMES = frozenset({"country"})

    def _admin_only_field_names(self, request: Request) -> frozenset[str]:
        if request_has_prism_admin_access(request):
            return frozenset()
        return self._ADMIN_ONLY_FIELD_NAMES

    def get_fields_list(
        self,
        request: Request,
        action: RequestAction = RequestAction.LIST,
    ) -> Sequence[BaseField]:
        hidden = self._admin_only_field_names(request)
        if not hidden:
            return super().get_fields_list(request, action)
        return [
            field
            for field in super().get_fields_list(request, action)
            if field.name not in hidden
        ]

    def _searchable_fields_for_request(self, request: Request) -> tuple[str, ...]:
        hidden = self._admin_only_field_names(request)
        return tuple(
            name
            for name in self.searchable_fields  # type: ignore[union-attr]
            if name not in hidden
        )

    async def _configs(self, request: Request) -> dict[str, Any]:
        configs = await super()._configs(request)
        hidden = self._admin_only_field_names(request)
        if not hidden:
            return configs
        searchable = self._searchable_fields_for_request(request)
        exportable = tuple(
            name for name in self.export_fields if name not in hidden  # type: ignore[union-attr]
        )
        configs["searchColumns"] = [f"{name}:name" for name in searchable]
        configs["exportColumns"] = [f"{name}:name" for name in exportable]
        return configs

    def is_accessible(self, request: Request) -> bool:
        return request_can_manage_map_exports(request)

    def can_view_details(self, request: Request) -> bool:
        return request_can_manage_map_exports(request)

    def can_edit(self, request: Request) -> bool:
        return request_can_manage_map_exports(request)

    def can_delete(self, request: Request) -> bool:
        return request_has_prism_admin_access(request)

    def can_create(self, request: Request) -> bool:
        if not request_can_manage_map_exports(request):
            return False
        return "clone_from" in request.query_params

    @staticmethod
    def _schedule_pk_as_uuid(pk: Any) -> UUID:
        if isinstance(pk, UUID):
            return pk
        return UUID(str(pk))

    async def schedule_download_available(
        self,
        request: Request,
        schedule_id: UUID,
    ) -> bool:
        session: Session = request.state.session
        return schedule_id in schedule_ids_with_downloadable_export(
            session,
            [schedule_id],
        )

    def render_row_actions_html(
        self,
        *,
        templates: Any,
        request: Request,
        pk: Any,
        actions: list[dict[str, Any]],
        download_available: bool,
    ) -> str:
        return templates.get_template("map_export_schedule_row_actions.html").render(
            _actions=actions,
            display_type=self.row_actions_display_type,
            pk=pk,
            request=request,
            model=self,
            download_available=download_available,
        )

    def get_list_query(self, request: Request) -> Select:
        stmt = (
            super()
            .get_list_query(request)
            .options(
                joinedload(MapExportSchedule.created_by_user),
            )
        )
        return _apply_schedule_owner_filter(stmt, request)

    def get_count_query(self, request: Request) -> Select:
        return _apply_schedule_owner_filter(super().get_count_query(request), request)

    def get_details_query(self, request: Request) -> Select:
        stmt = (
            super()
            .get_details_query(request)
            .options(
                joinedload(MapExportSchedule.created_by_user),
            )
        )
        return _apply_schedule_owner_filter(stmt, request)

    def get_search_query(self, request: Request, term: str) -> Any:
        """Case-insensitive search across schedule columns and scheduler identity."""
        _ = request
        term_lower = term.strip().lower()
        if not term_lower:
            return None
        clauses = []
        for field_name in self._searchable_fields_for_request(request):
            attr = getattr(self.model, field_name, None)
            if attr is None:
                continue
            clauses.append(func.lower(cast(attr, String)).contains(term_lower))
        clauses.append(
            self.model.created_by_user.has(
                or_(
                    func.lower(cast(User.email, String)).contains(term_lower),
                    func.lower(cast(User.name, String)).contains(term_lower),
                    func.lower(cast(User.ciam_sub, String)).contains(term_lower),
                ),
            ),
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
        if not source.country:
            raise FormValidationError(
                {"__all__": "Source schedule is missing country"},
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
        serialized["created_by_user"] = None
        return serialized

    @action(
        name="update_status",
        text="Update status",
        confirmation="Update the status of the selected map export schedules?",
        submit_btn_text="Update status",
        submit_btn_class="btn-primary",
        icon_class="fa-solid fa-toggle-on",
        form=_BULK_UPDATE_STATUS_FORM,
    )
    async def update_status_action(self, request: Request, pks: List[Any]) -> str:
        data = await request.form()
        status_raw = data.get("status")
        if not status_raw:
            raise ActionFailed("Status is required")
        try:
            new_status = MapExportScheduleStatus(str(status_raw))
        except ValueError as exc:
            raise ActionFailed(f"Invalid status: {status_raw}") from exc

        session: Session = request.state.session
        schedules = list(await self.find_by_pks(request, pks))
        if not schedules:
            raise ActionFailed("No accessible schedules selected")

        now = utc_now()
        for schedule in schedules:
            schedule.status = new_status
            schedule.updated_at = now
            session.add(schedule)
        session.commit()

        count = len(schedules)
        label = new_status.value
        return f"Updated {count} schedule{'s' if count != 1 else ''} to {label}."

    @action(
        name="delete",
        text="Delete schedules",
        confirmation=(
            "Are you sure you want to delete the selected map export schedules? "
            "This cannot be undone."
        ),
        submit_btn_text="Yes, delete",
        submit_btn_class="btn-danger",
        icon_class="fa-solid fa-trash",
    )
    async def delete_action(self, request: Request, pks: List[Any]) -> str:
        affected_rows = await self.delete(request, pks)
        return ngettext(
            "Schedule was successfully deleted",
            "%(count)d schedules were successfully deleted",
            affected_rows or 0,
        ) % {"count": affected_rows}

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

    @row_action(
        name="download",
        text="Download",
        icon_class="fa-solid fa-download",
        action_btn_class="btn-secondary",
        custom_response=True,
    )
    async def download_latest_export_row_action(
        self,
        request: Request,
        pk: Any,
    ) -> Response:
        schedule = await self.find_by_pk(request, pk)
        if schedule is None:
            raise ActionFailed("Schedule not found or not accessible")
        session: Session = request.state.session
        job = latest_succeeded_job_for_schedule(session, schedule.id)
        if job is None:
            raise ActionFailed(SCHEDULE_DOWNLOAD_UNAVAILABLE_MSG)
        try:
            return schedule_export_download_response(job)
        except HTTPException as exc:
            raise ActionFailed(str(exc.detail)) from exc

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
        if not clone_from:
            raise FormValidationError(
                {
                    "__all__": "Schedules can only be created by cloning an existing schedule",
                },
            )
        source = await self._load_clone_source(request, clone_from)
        obj.export_url = source.export_url
        obj.export_options = source.export_options
        obj.admin_areas = source.admin_areas

        user = admin_user_from_request(request)
        country = source.country
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
