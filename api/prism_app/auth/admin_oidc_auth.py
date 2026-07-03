"""Starlette-admin OIDC: custom login redirect, session cookie gate, and admin panel access."""

from __future__ import annotations

from typing import Optional, Union
from urllib.parse import quote, urlencode

from prism_app.auth.access_pages import access_denied_response
from prism_app.auth.admin_settings import (
    AdminAuthSettings,
    log_oidc_configuration_blocked,
)
from prism_app.auth.deps import load_user_from_session
from prism_app.auth.dev_impersonation import load_dev_impersonation, parse_dev_user_id
from prism_app.auth.permission_codes import ALL_CAPABILITIES, can_access_admin_panel
from prism_app.auth.prism_auth_service import is_active
from sqlalchemy.engine import Engine
from starlette.middleware import Middleware
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import PlainTextResponse, RedirectResponse, Response
from starlette.routing import Match, Mount, Route, WebSocketRoute
from starlette.status import HTTP_303_SEE_OTHER
from starlette.types import ASGIApp
from starlette_admin.auth import AdminUser, BaseAuthProvider
from starlette_admin.base import BaseAdmin


class PrismAdminAuthProvider(BaseAuthProvider):
    """Redirects /admin/login to ``/auth/sign-in``; validates session + admin panel permissions."""

    def __init__(self, engine: Engine, settings: AdminAuthSettings) -> None:
        super().__init__(
            login_path="/login",
            logout_path="/logout",
        )
        self.engine = engine
        self.settings = settings

    def get_middleware(self, admin: BaseAdmin) -> Middleware:
        return Middleware(
            PrismAdminAuthMiddleware,
            provider=self,
        )

    def setup_admin(self, admin: BaseAdmin) -> None:
        from starlette.routing import Route
        from starlette_admin.helpers import wrap_endpoint_with_kwargs

        admin.middlewares.append(self.get_middleware(admin=admin))
        login_route = Route(
            self.login_path,
            wrap_endpoint_with_kwargs(self._render_oidc_login_redirect, admin=admin),
            methods=["GET"],
        )
        login_route.name = "login"
        logout_route = Route(
            self.logout_path,
            wrap_endpoint_with_kwargs(self._render_logout, admin=admin),
            methods=["GET"],
        )
        logout_route.name = "logout"
        admin.routes.extend([login_route, logout_route])

    async def _render_oidc_login_redirect(
        self, request: Request, admin: BaseAdmin
    ) -> Response:
        nxt = request.query_params.get("next") or str(request.url_for("index"))
        return RedirectResponse(
            url=f"/auth/welcome?next={quote(nxt, safe='')}",
            status_code=HTTP_303_SEE_OTHER,
        )

    async def _render_logout(self, request: Request, admin: BaseAdmin) -> Response:
        return RedirectResponse(
            url="/auth/sign-out?next=%2Fauth%2Fwelcome",
            status_code=HTTP_303_SEE_OTHER,
        )

    async def is_authenticated(self, request: Request) -> bool:
        """Unused by ``PrismAdminAuthMiddleware``; implemented for API compatibility."""
        return getattr(request.state, "prism_user", None) is not None

    def get_admin_user(self, request: Request) -> AdminUser | None:
        user = getattr(request.state, "prism_user", None)
        if user is not None:
            label = user.email or user.name or user.ciam_sub
            if self.settings.admin_auth_disabled and parse_dev_user_id(self.settings):
                return AdminUser(username=f"{label} (dev impersonation)")
            return AdminUser(username=label)
        if self.settings.admin_auth_disabled:
            return AdminUser(username="(auth disabled — local only)")
        return None

    def get_admin_config(self, request: Request):
        return None  # pragma: no cover


class PrismAdminAuthMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: ASGIApp,
        provider: PrismAdminAuthProvider,
    ) -> None:
        super().__init__(app)
        self.provider = provider
        p = provider
        self.allow_paths = list(p.allow_paths) if p.allow_paths else []
        self.allow_routes = ["login", "statics", "logout"]
        self.allow_routes.extend(p.allow_routes or [])

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        from starlette.applications import Starlette

        _admin_app: Starlette = request.scope["app"]
        current_route: Optional[Union[Route, Mount, WebSocketRoute]] = None
        for route in _admin_app.routes:
            match, _ = route.matches(request.scope)
            if match == Match.FULL:
                assert isinstance(route, (Route, Mount, WebSocketRoute))
                current_route = route
                break

        prov = self.provider
        settings = prov.settings

        if settings.admin_auth_disabled:
            dev_user_id = parse_dev_user_id(settings)
            if dev_user_id is not None:
                loaded = load_dev_impersonation(prov.engine, dev_user_id)
                if loaded is None:
                    return PlainTextResponse(
                        f"PRISM_DEV_USER_ID user not found or inactive: {dev_user_id}",
                        status_code=503,
                    )
                user, codes, scopes = loaded
                if not can_access_admin_panel(codes):
                    return PlainTextResponse(
                        "PRISM_DEV_USER_ID user cannot access the admin panel.",
                        status_code=403,
                    )
                request.state.prism_user = user
                request.state.permission_codes = codes
                request.state.permission_scopes = scopes
                return await call_next(request)
            request.state.permission_codes = set(ALL_CAPABILITIES)
            request.state.permission_scopes = {}
            return await call_next(request)

        is_public = (
            (current_route is not None and current_route.path in self.allow_paths)
            or (current_route is not None and current_route.name in self.allow_routes)
            or (
                current_route is not None
                and hasattr(current_route, "endpoint")
                and getattr(current_route.endpoint, "_login_not_required", False)
            )
        )

        if is_public:
            return await call_next(request)

        if not settings.oidc_providers():
            log_oidc_configuration_blocked(settings, where="Starlette-admin middleware")
            return PlainTextResponse(
                "OIDC is not configured for this deployment.",
                status_code=503,
            )

        user, codes, scopes, _ = load_user_from_session(
            request,
            prov.engine,
            settings,
        )

        if user is None:
            next_path = request.url.path
            if request.url.query:
                next_path = f"{next_path}?{request.url.query}"
            return RedirectResponse(
                url=f"/auth/welcome?{urlencode({'next': next_path})}",
                status_code=HTTP_303_SEE_OTHER,
            )

        if not is_active(user):
            return access_denied_response(settings.access_support_email)

        if not can_access_admin_panel(codes):
            return RedirectResponse("/access-not-configured", HTTP_303_SEE_OTHER)

        request.state.prism_user = user
        request.state.permission_codes = codes
        request.state.permission_scopes = scopes
        return await call_next(request)
