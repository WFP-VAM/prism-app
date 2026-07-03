"""AA drought admin country field visibility and inference from permission scope."""

from __future__ import annotations

from typing import Any

from prism_app.auth.admin_request import (
    request_allowed_countries,
    request_has_prism_admin_access,
)
from prism_app.auth.permission_codes import AA_DATA_MANAGE
from prism_app.database.aa_drought_model import AaDroughtCountry
from starlette.requests import Request
from starlette_admin.exceptions import FormValidationError

_AMBIGUOUS_AA_COUNTRY_MSG = (
    "Your account must have AA drought access for exactly one country."
)


def aa_drought_country_field_visible(request: Request) -> bool:
    """Full admins pick country; scoped AA managers have it inferred."""
    return request_has_prism_admin_access(request)


def infer_aa_drought_country(request: Request) -> AaDroughtCountry:
    """Resolve the single country from a scoped ``prism.aa_data.manage`` grant."""
    allowed = request_allowed_countries(request, AA_DATA_MANAGE)
    if allowed is None or len(allowed) != 1:
        raise FormValidationError({"__all__": _AMBIGUOUS_AA_COUNTRY_MSG})
    country_slug = next(iter(allowed))
    try:
        return AaDroughtCountry(country_slug)
    except ValueError as exc:
        raise FormValidationError(
            {"country": f"Unknown AA drought country '{country_slug}'."}
        ) from exc


def apply_inferred_aa_drought_country(
    request: Request,
    data: dict[str, Any],
) -> None:
    if aa_drought_country_field_visible(request) or data.get("country"):
        return
    data["country"] = infer_aa_drought_country(request)
