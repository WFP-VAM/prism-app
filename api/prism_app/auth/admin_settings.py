"""Environment-backed settings for admin OIDC and session cookies."""

import logging
import os
import secrets
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


def _deployment_is_production() -> bool:
    return os.getenv("PRISM_ENV", "").strip().lower() in {"production", "prod"}


class AdminAuthSettings(BaseSettings):
    """Load from environment with PRISM_ prefix (see api/.env.example)."""

    model_config = SettingsConfigDict(
        env_prefix="PRISM_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Issuer URL exactly as in CIAM discovery JSON "issuer" (see docs.ciam.auth.wfp.org).
    oidc_issuer: str = ""
    oidc_client_id: str = ""
    oidc_client_secret: str = ""
    oidc_redirect_uri: str = ""
    oidc_scopes: str = "openid profile email"
    # Optional authorize URL `prompt` (e.g. `login` asks CIAM to show login despite an SSO cookie).
    oidc_authorize_prompt: str = ""

    session_secret: str = ""
    session_cookie_name: str = "prism_session"
    session_cookie_secure: bool = True
    # React apps (*.wfp.org, Amplify, Firebase) are always on a different site than this API.
    # SameSite=Lax omits the session cookie on cross-origin credentialed fetch (/whoami, schedules).
    # None + Secure (below) is required so browsers send prism_session to prism-api from the SPA.
    session_cookie_samesite: str = "none"
    session_ttl_seconds: int = 3600
    oidc_state_cookie_name: str = "prism_oidc_state"
    oidc_state_ttl_seconds: int = 600
    # HttpOnly cookie storing the signed-in user's id_token for RP-initiated CIAM logout (`id_token_hint`).
    oidc_id_token_hint_cookie_name: str = "prism_oidc_id_token"
    # Allowed return URL after CIAM logout; must be registered on the OIDC client.
    # See https://docs.ciam.auth.wfp.org/login-workflows/#about-logout
    oidc_post_logout_redirect_uri: str = ""

    access_support_email: str = ""
    admin_auth_disabled: bool = False

    @property
    def oidc_configured(self) -> bool:
        return bool(
            self.oidc_issuer.strip()
            and self.oidc_client_id.strip()
            and self.oidc_client_secret.strip()
            and self.oidc_redirect_uri.strip()
        )

    def missing_oidc_env_names(self) -> list[str]:
        """PRISM_* env vars that are blank here and block redirects to CIAM."""
        missing: list[str] = []
        if not self.oidc_issuer.strip():
            missing.append("PRISM_OIDC_ISSUER")
        if not self.oidc_client_id.strip():
            missing.append("PRISM_OIDC_CLIENT_ID")
        if not self.oidc_client_secret.strip():
            missing.append("PRISM_OIDC_CLIENT_SECRET")
        if not self.oidc_redirect_uri.strip():
            missing.append("PRISM_OIDC_REDIRECT_URI")
        if (
            self.oidc_configured
            and not self.session_secret.strip()
            and _deployment_is_production()
        ):
            missing.append("PRISM_SESSION_SECRET")
        return missing

    def diagnostic_dict(self) -> dict[str, str | bool | int]:
        """Non-secret snapshot for logs (never includes client_secret or session_secret values)."""

        issuer = self.oidc_issuer.strip()
        redirect = self.oidc_redirect_uri.strip()
        return {
            "oidc_configured": self.oidc_configured,
            "admin_auth_disabled": self.admin_auth_disabled,
            "PRISM_ENV": os.getenv("PRISM_ENV", ""),
            "deployment_is_production": _deployment_is_production(),
            "missing_oidc_env": self.missing_oidc_env_names(),
            "PRISM_OIDC_ISSUER_set": bool(issuer),
            "PRISM_OIDC_CLIENT_ID_set": bool(self.oidc_client_id.strip()),
            "PRISM_OIDC_CLIENT_SECRET_set": bool(self.oidc_client_secret.strip()),
            "PRISM_OIDC_REDIRECT_URI_set": bool(redirect),
            "PRISM_SESSION_SECRET_set": bool(self.session_secret.strip()),
            "issuer_non_empty_chars": len(issuer),
            "redirect_non_empty_chars": len(redirect),
            "scopes_non_empty_chars": len(self.oidc_scopes.strip()),
        }


def log_oidc_configuration_blocked(settings: AdminAuthSettings, *, where: str) -> None:
    """Log loaded settings when user-facing flow reports OIDC is not configured (secrets omitted)."""

    logger.warning(
        "Admin OIDC inactive %s cwd=%s %s",
        where,
        os.getcwd(),
        settings.diagnostic_dict(),
    )


@lru_cache
def get_admin_auth_settings() -> AdminAuthSettings:
    settings = AdminAuthSettings()
    if _deployment_is_production():
        if settings.admin_auth_disabled:
            raise ValueError(
                "PRISM_ADMIN_AUTH_DISABLED cannot be enabled when PRISM_ENV is production (or prod). "
                "Admin auth bypass is for local development only."
            )
        if not settings.session_secret.strip():
            raise ValueError(
                "PRISM_SESSION_SECRET is required when PRISM_ENV is production (or prod). "
                "Generate one locally: openssl rand -hex 32 — see api/README.md."
            )
        return settings
    if not settings.session_secret.strip():
        logger.warning(
            "PRISM_SESSION_SECRET empty: generating ephemeral signing key for "
            "SessionMiddleware and OIDC state (lost on restart; use one uvicorn worker per process; "
            "set PRISM_SESSION_SECRET in .env for stable local sessions). "
            "Never deploy without PRISM_SESSION_SECRET and PRISM_ENV=production."
        )
        return settings.model_copy(update={"session_secret": secrets.token_hex(32)})
    return settings
