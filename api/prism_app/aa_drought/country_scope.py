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

_AA_COUNTRY_CHOICES = [(c.value, c.value) for c in AaDroughtCountry]

_AMBIGUOUS_AA_COUNTRY_MSG = (
    "Your account must have AA drought access for exactly one country."
)


def aa_drought_selectable_countries(request: Request) -> frozenset[str] | None:
    """Countries the user may pick in the AA admin form; ``None`` means all AA countries."""
    if request_has_prism_admin_access(request):
        return None
    return request_allowed_countries(request, AA_DATA_MANAGE)


def aa_drought_country_field_visible(request: Request) -> bool:
    """Show country when the user must pick (admin, ``*``, or multi-country grant)."""
    if request_has_prism_admin_access(request):
        return True
    allowed = aa_drought_selectable_countries(request)
    if allowed is None:
        return True
    return len(allowed) != 1


def aa_drought_country_choices(
    request: Request,
) -> list[tuple[str, str]]:
    """Dropdown choices for the country field, limited to the user's AA scope."""
    allowed = aa_drought_selectable_countries(request)
    if allowed is None:
        return list(_AA_COUNTRY_CHOICES)
    return [(code, code) for code in sorted(allowed)]


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
