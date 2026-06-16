"""Starlette Admin: full CRUD for AA drought CSV datasets (raw CSV + lifecycle)."""

from __future__ import annotations

import uuid
from typing import Any, cast

from prism_app.aa_drought.csv_field import AaDroughtCsvFileField
from prism_app.aa_drought.validate_csv import validate_aa_drought_csv_upload
from prism_app.aa_drought.validation import validate_aa_drought_csv
from prism_app.database.aa_drought_model import (
    AaDroughtCountry,
    AaDroughtDatasetModel,
    AaDroughtStatus,
)
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker
from starlette.requests import Request
from starlette.routing import Route
from starlette_admin.contrib.sqla import Admin, ModelView
from starlette_admin.exceptions import FormValidationError
from starlette_admin.fields import EnumField
from sqlmodel import col

_AA_COUNTRY_CHOICES = [(c.value, c.value) for c in AaDroughtCountry]
_AA_STATUS_CHOICES = [(s.value, s.value) for s in AaDroughtStatus]

_DUPLICATE_COUNTRY_STATUS_MSG = (
    "Another dataset for this country already has this status. Archive or change "
    "the other dataset's status first."
)
_CSV_NOT_VALIDATED_MSG = "Click Validate and fix any errors before saving."


def register_aa_drought_admin_routes(admin: Admin) -> None:
    """AJAX CSV validation used by the admin upload form."""
    admin.routes.append(
        Route(
            "/aa-drought/validate-csv",
            validate_aa_drought_csv_upload,
            methods=["POST"],
            name="aa_drought_validate_csv",
        )
    )


def _duplicate_country_status(
    engine: Engine,
    country: AaDroughtCountry,
    status: AaDroughtStatus,
    *,
    exclude_id: uuid.UUID | None = None,
) -> bool:
    """True when another non-edit row already uses this country + status."""
    if status == AaDroughtStatus.archived:
        return False

    SessionLocal = sessionmaker(engine, class_=Session, expire_on_commit=False)
    with SessionLocal() as session:
        stmt = (
            select(AaDroughtDatasetModel.id)
            .where(col(AaDroughtDatasetModel.country) == country)
            .where(col(AaDroughtDatasetModel.status) == status)
        )
        if exclude_id is not None:
            stmt = stmt.where(col(AaDroughtDatasetModel.id) != exclude_id)
        return session.scalar(stmt) is not None


class AaDroughtAdminView(ModelView):
    """Create / edit / delete AA drought datasets.

    The dataset is uploaded as a raw ``.csv`` file (drag-and-drop or browse) and
    served back to PRISM verbatim. Each upload is the complete, cumulative file
    (all seasons) — publishing replaces the country's previously published data.
    """

    label = "AA drought data"
    name = "aa_drought_dataset"
    create_template = "create_no_add_another.html"
    edit_template = "edit_no_add_another.html"
    fields = [
        EnumField(
            "country",
            label="Country",
            required=True,
            choices=_AA_COUNTRY_CHOICES,
        ),
        EnumField(
            "status",
            label="Status",
            required=True,
            choices=_AA_STATUS_CHOICES,
        ),
        AaDroughtCsvFileField(
            "csv_content",
            label="CSV file",
            required=True,
            help_text=(
                "Upload the complete AA drought probabilities/triggers CSV "
                "(all seasons). Required columns: district, index, category, "
                "window, season, prob_ready, prob_set, trigger_ready, "
                "trigger_set, date_ready, date_set, vulnerability."
            ),
        ),
        "row_count",
        "created_at",
        "updated_at",
    ]
    exclude_fields_from_list = ("csv_content",)
    exclude_fields_from_create = (
        "id",
        "row_count",
        "created_at",
        "updated_at",
    )
    exclude_fields_from_edit = (
        "id",
        "row_count",
        "created_at",
        "updated_at",
    )
    searchable_fields = ["status", "country"]

    async def validate(self, request: Request, data: dict[str, Any]) -> None:
        errors: dict[str, str] = {}

        form = await request.form()
        if form.get("aa_drought_csv_validated") != "1":
            errors["csv_content"] = _CSV_NOT_VALIDATED_MSG

        status_val = data.get("status")
        status: AaDroughtStatus | None = None
        if not status_val:
            errors["status"] = "Status is required."
        else:
            try:
                status = AaDroughtStatus(status_val)
                data["status"] = status
            except ValueError:
                errors["status"] = f"Invalid status value '{status_val}'."

        country_val = data.get("country")
        country: AaDroughtCountry | None = None
        if not country_val:
            errors["country"] = "Country is required."
        else:
            try:
                country = AaDroughtCountry(country_val)
                data["country"] = country
            except ValueError:
                errors["country"] = f"Invalid country value '{country_val}'."

        csv_text = data.get("csv_content")
        if not isinstance(csv_text, str) or not csv_text.strip():
            errors["csv_content"] = "Upload a valid CSV file."
        else:
            result = validate_aa_drought_csv(csv_text)
            if not result.ok:
                errors["csv_content"] = " ".join(result.errors)
            else:
                data["csv_content"] = csv_text
                data["row_count"] = result.row_count

        if country is not None and status is not None and "status" not in errors:
            exclude_id: uuid.UUID | None = None
            pk = request.path_params.get("pk")
            if pk:
                try:
                    exclude_id = uuid.UUID(str(pk))
                except ValueError:
                    pass
            engine = request.app.state.admin_engine
            if _duplicate_country_status(
                engine, country, status, exclude_id=exclude_id
            ):
                errors["status"] = _DUPLICATE_COUNTRY_STATUS_MSG

        if errors:
            raise FormValidationError(cast(dict[str | int, Any], errors))

    async def before_create(
        self, request: Request, data: dict[str, Any], obj: Any
    ) -> None:
        row_count = data.get("row_count")
        if isinstance(row_count, int):
            obj.row_count = row_count

    async def before_edit(
        self, request: Request, data: dict[str, Any], obj: Any
    ) -> None:
        row_count = data.get("row_count")
        if isinstance(row_count, int):
            obj.row_count = row_count

    def handle_exception(self, exc: Exception) -> None:
        """Convert partial unique index violations into friendly form errors."""
        if isinstance(exc, IntegrityError):
            error_msg = str(exc.orig) if hasattr(exc, "orig") else str(exc)
            if (
                "uq_aa_drought_country_status" in error_msg
                or "uq_aa_drought_published_country" in error_msg
            ):
                raise FormValidationError(
                    cast(
                        dict[str | int, Any],
                        {"status": _DUPLICATE_COUNTRY_STATUS_MSG},
                    )
                )
        return super().handle_exception(exc)
