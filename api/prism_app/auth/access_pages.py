"""Small HTML responses for PRISM authorization outcomes."""

from __future__ import annotations

from pathlib import Path

from fastapi.responses import HTMLResponse
from jinja2 import ChoiceLoader, Environment, FileSystemLoader, select_autoescape
from starlette_admin import __file__ as _starlette_admin_file

_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "access_pages"
_STARLETTE_ADMIN_TEMPLATES_DIR = (
    Path(_starlette_admin_file).resolve().parent / "templates"
)
_TEMPLATE_ENV = Environment(
    loader=ChoiceLoader(
        [
            FileSystemLoader(str(_TEMPLATES_DIR)),
            FileSystemLoader(str(_STARLETTE_ADMIN_TEMPLATES_DIR)),
        ]
    ),
    autoescape=select_autoescape(["html", "xml"]),
)
_TEMPLATE_ENV.globals.update(
    {
        "__name__": "admin",
        "app_title": "PRISM Admin",
        "favicon_url": None,
        "get_locale": lambda: "en",
        "url_for": lambda name, **kwargs: (
            f"/admin/statics/{kwargs['path']}" if name.endswith(":statics") else "#"
        ),
    }
)


def _render_template(name: str, status_code: int, **context: object) -> HTMLResponse:
    html = _TEMPLATE_ENV.get_template(name).render(**context)
    return HTMLResponse(content=html, status_code=status_code)


def access_denied_response(support_email: str = "") -> HTMLResponse:
    return _render_template(
        "access_denied.html",
        status_code=403,
        support_email=support_email,
    )


def oidc_session_interrupted_response() -> HTMLResponse:
    """Callback could not complete: stale code, missing state cookie, bad state, or token error."""
    return _render_template("oidc_session_interrupted.html", status_code=200)


def access_not_configured_response(support_email: str = "") -> HTMLResponse:
    return _render_template(
        "access_not_configured.html",
        status_code=200,
        support_email=support_email,
    )


def signed_out_response() -> HTMLResponse:
    """After sign-out: PRISM cookies are cleared; CIAM may redirect here when post_logout_redirect_uri is configured."""
    return _render_template("signed_out.html", status_code=200)


def welcome_response(
    *, sign_in_href: str = "/auth/sign-in?next=%2Fadmin%2F"
) -> HTMLResponse:
    """Landing page for unauthenticated admin access; links to the CIAM sign-in flow."""
    return _render_template(
        "welcome.html",
        status_code=200,
        sign_in_href=sign_in_href,
    )


def sign_out_confirm_response(csrf_token: str) -> HTMLResponse:
    """Prompt for POST /auth/sign-out with CSRF token (see router)."""
    return _render_template(
        "sign_out_confirm.html",
        status_code=200,
        csrf_token=csrf_token,
    )


def sign_out_csrf_failed_response() -> HTMLResponse:
    """POST /auth/sign-out without a valid CSRF synchronizer."""
    return _render_template(
        "sign_out_csrf_failed.html",
        status_code=403,
    )
