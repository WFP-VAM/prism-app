"""Deployment-country scoping for AA drought admin (non-``prism.admin.access`` users)."""

from __future__ import annotations

from prism_app.auth.admin_request import request_has_prism_admin_access
from prism_app.database.aa_drought_model import AaDroughtCountry, AaDroughtDatasetModel
from prism_app.map_export_layer_catalog import get_deployment_country
from sqlalchemy.sql import Select
from sqlmodel import col
from starlette.requests import Request

_NO_AA_DEPLOYMENT_MSG = "This deployment is not configured for AA drought data."
_WRONG_COUNTRY_MSG = "You can only manage AA drought data for this deployment's country."


def deployment_aa_country() -> AaDroughtCountry | None:
    """Map ``REACT_APP_COUNTRY`` / ``PRISM_DEPLOYMENT_COUNTRY`` to an AA country, if any."""
    try:
        return AaDroughtCountry(get_deployment_country())
    except ValueError:
        return None


def aa_country_scope_error(request: Request) -> str | None:
    """Block AA managers when the deployment has no AA drought country."""
    if request_has_prism_admin_access(request):
        return None
    if deployment_aa_country() is None:
        return _NO_AA_DEPLOYMENT_MSG
    return None


def enforce_aa_country_value(
    request: Request,
    country_val: str | None,
) -> tuple[AaDroughtCountry | None, str | None]:
    """Resolve the country a save/validate may use; returns ``(country, error)``."""
    scope_err = aa_country_scope_error(request)
    if scope_err:
        return None, scope_err

    if request_has_prism_admin_access(request):
        if not country_val:
            return None, "Country is required."
        try:
            return AaDroughtCountry(country_val), None
        except ValueError:
            return None, f"Invalid country value '{country_val}'."

    deployment = deployment_aa_country()
    assert deployment is not None  # guarded by aa_country_scope_error
    if country_val and country_val != deployment.value:
        return None, _WRONG_COUNTRY_MSG
    return deployment, None


def apply_aa_country_filter(stmt: Select, request: Request) -> Select:
    """Limit list/detail queries to the deployment country for non-admins."""
    if request_has_prism_admin_access(request):
        return stmt
    country = deployment_aa_country()
    if country is None:
        return stmt.where(col(AaDroughtDatasetModel.id).is_(None))
    return stmt.where(col(AaDroughtDatasetModel.country) == country)
