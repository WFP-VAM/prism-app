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
            url=f"/auth/sign-in?next={quote(nxt, safe='')}",
            status_code=HTTP_303_SEE_OTHER,
        )

    async def _render_logout(self, request: Request, admin: BaseAdmin) -> Response:
        return RedirectResponse(url="/auth/sign-out", status_code=HTTP_303_SEE_OTHER)

    async def is_authenticated(self, request: Request) -> bool:
        """Unused by ``PrismAdminAuthMiddleware``; implemented for API compatibility."""
        return getattr(request.state, "prism_user", None) is not None

    def get_admin_user(self, request: Request) -> AdminUser | None:
        user = getattr(request.state, "prism_user", None)
        if self.settings.admin_auth_disabled:
            return AdminUser(username="(auth disabled — local only)")
        if user is None:
            return None
        label = user.email or user.name or user.ciam_sub
        return AdminUser(username=label)

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
            request.state.permission_codes = set(ALL_CAPABILITIES)
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

        if not settings.oidc_configured:
            log_oidc_configuration_blocked(settings, where="Starlette-admin middleware")
            return PlainTextResponse(
                "OIDC is not configured for this deployment.",
                status_code=503,
            )

        user, codes, _ = load_user_from_session(
            request,
            prov.engine,
            settings,
        )

        if user is None:
            return RedirectResponse(
                "{url}?{query_params}".format(
                    url=request.url_for(request.app.state.ROUTE_NAME + ":login"),
                    query_params=urlencode({"next": str(request.url)}),
                ),
                status_code=HTTP_303_SEE_OTHER,
            )

        if not is_active(user):
            return access_denied_response(settings.access_support_email)

        if not can_access_admin_panel(codes):
            return RedirectResponse("/access-not-configured", HTTP_303_SEE_OTHER)

        request.state.prism_user = user
        request.state.permission_codes = codes
        return await call_next(request)
