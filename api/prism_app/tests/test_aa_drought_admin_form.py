"""AA drought admin form: country dropdown for admins and AA managers."""

from prism_app.aa_drought.aa_drought_admin import AaDroughtAdminView
from prism_app.auth.permission_codes import AA_DATA_MANAGE, ADMIN_ACCESS
from prism_app.database.aa_drought_model import AaDroughtDatasetModel
from starlette.requests import Request
from starlette_admin._types import RequestAction


def _request(*, codes: set[str]) -> Request:
    scope = {"type": "http", "method": "GET", "path": "/admin/", "headers": []}
    request = Request(scope)
    request.state.permission_codes = codes
    return request


def test_country_field_visible_for_admin_and_aa_manager() -> None:
    view = AaDroughtAdminView(AaDroughtDatasetModel)

    for codes in ({ADMIN_ACCESS}, {AA_DATA_MANAGE}):
        request = _request(codes=codes)
        for action in (RequestAction.CREATE, RequestAction.EDIT, RequestAction.LIST):
            field_names = {
                field.name for field in view.get_fields_list(request, action)
            }
            assert "country" in field_names
