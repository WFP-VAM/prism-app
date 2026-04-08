"""Starlette-admin OIDC: custom login redirect, session cookie gate, and ``prism.admin`` check."""

from __future__ import annotations

from typing import Optional, Union
from urllib.parse import urlencode
from uuid import UUID

import jwt
from sqlalchemy.engine import Engine
from starlette.middleware import Middleware
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import RedirectResponse, Response
from starlette.routing import Match, Mount, Route, WebSocketRoute
from starlette.types import ASGIApp
from starlette_admin.auth import AdminUser, BaseAuthProvider
from starlette.status import HTTP_303_SEE_OTHER

from prism_app.access_pages import access_denied_response, oidc_not_configured_response
from prism_app.admin_settings import AdminAuthSettings
from prism_app.oidc_support import verify_session_cookie
from prism_app.permission_codes import PRISM_ADMIN, PRISM_APP
from prism_app.prism_auth_service import is_active, load_user_and_permissions
from starlette_admin.base import BaseAdmin

class PrismAdminAuthProvider(BaseAuthProvider):
    """Redirects /admin/login to ``/auth/sign-in``; validates session + ``prism.admin`` in middleware."""

    def __init__(self, engine: Engine, settings: AdminAuthSettings) -> None:
        super().__init__(
            login_path="/login",
            logout_path="/logout",
            allow_routes=["api", "api:file"],
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
        from urllib.parse import quote

        nxt = request.query_params.get("next") or str(request.url_for("index"))
        return RedirectResponse(
            url=f"/auth/sign-in?next={quote(nxt, safe='')}",
            status_code=HTTP_303_SEE_OTHER,
        )

    async def _render_logout(self, request: Request, admin: BaseAdmin) -> Response:
        r = RedirectResponse(url="/admin/", status_code=HTTP_303_SEE_OTHER)
        r.delete_cookie(self.settings.session_cookie_name, path="/")
        r.delete_cookie(self.settings.oidc_state_cookie_name, path="/")
        return r

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
            request.state.permission_codes = {PRISM_ADMIN, PRISM_APP}
            return await call_next(request)

        is_public = (
            current_route is not None and current_route.path in self.allow_paths
        ) or (
            current_route is not None and current_route.name in self.allow_routes
        ) or (
            current_route is not None
            and hasattr(current_route, "endpoint")
            and getattr(current_route.endpoint, "_login_not_required", False)
        )

        if is_public:
            return await call_next(request)

        if not settings.oidc_configured:
            return oidc_not_configured_response()

        raw = request.cookies.get(settings.session_cookie_name)
        if not raw:
            return RedirectResponse(
                "{url}?{query_params}".format(
                    url=request.url_for(request.app.state.ROUTE_NAME + ":login"),
                    query_params=urlencode({"next": str(request.url)}),
                ),
                status_code=HTTP_303_SEE_OTHER,
            )

        try:
            claims = verify_session_cookie(settings, raw)
        except jwt.PyJWTError:
            return RedirectResponse(
                "{url}?{query_params}".format(
                    url=request.url_for(request.app.state.ROUTE_NAME + ":login"),
                    query_params=urlencode({"next": str(request.url)}),
                ),
                status_code=HTTP_303_SEE_OTHER,
            )

        user, codes = load_user_and_permissions(prov.engine, UUID(claims["uid"]))
        if not is_active(user):
            return access_denied_response(settings.access_support_email)

        if PRISM_ADMIN not in codes:
            return RedirectResponse("/access-not-configured", HTTP_303_SEE_OTHER)

        assert user is not None
        request.state.prism_user = user
        request.state.permission_codes = codes
        return await call_next(request)
