"""Starlette Admin: full CRUD for AA drought CSV datasets (raw CSV + lifecycle)."""

from typing import Any, cast

from prism_app.aa_drought.csv_field import AaDroughtCsvFileField
from prism_app.aa_drought.validation import validate_aa_drought_csv
from prism_app.database.aa_drought_model import AaDroughtCountry, AaDroughtStatus
from sqlalchemy.exc import IntegrityError
from starlette.requests import Request
from starlette_admin.contrib.sqla import ModelView
from starlette_admin.exceptions import FormValidationError
from starlette_admin.fields import EnumField

_AA_COUNTRY_CHOICES = [(c.value, c.value) for c in AaDroughtCountry]
_AA_STATUS_CHOICES = [(s.value, s.value) for s in AaDroughtStatus]

_DUPLICATE_PUBLISHED_MSG = (
    "Another dataset for this country is already published. Archive or unpublish "
    "it first, or set this one to draft/staging."
)


class AaDroughtAdminView(ModelView):
    """Create / edit / delete AA drought datasets.

    The dataset is uploaded as a raw ``.csv`` file (drag-and-drop or browse) and
    served back to PRISM verbatim. Each upload is the complete, cumulative file
    (all seasons) — publishing replaces the country's previously published data.
    """

    label = "AA drought data"
    name = "aa_drought_dataset"
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

        status_val = data.get("status")
        if not status_val:
            errors["status"] = "Status is required."
        else:
            try:
                data["status"] = AaDroughtStatus(status_val)
            except ValueError:
                errors["status"] = f"Invalid status value '{status_val}'."

        country_val = data.get("country")
        if not country_val:
            errors["country"] = "Country is required."
        else:
            try:
                data["country"] = AaDroughtCountry(country_val)
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
        """Convert the partial unique index violation (two published rows for one
        country) into a friendly form error."""
        if isinstance(exc, IntegrityError):
            error_msg = str(exc.orig) if hasattr(exc, "orig") else str(exc)
            if "uq_aa_drought_published_country" in error_msg:
                raise FormValidationError(
                    cast(
                        dict[str | int, Any],
                        {"status": _DUPLICATE_PUBLISHED_MSG},
                    )
                )
        return super().handle_exception(exc)
