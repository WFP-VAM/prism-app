"""Environment-backed settings for admin OIDC and session cookies."""

import logging
import os
import secrets
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


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
    session_cookie_secure: bool = False
    session_cookie_samesite: str = "lax"
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
    # Dev-only: store raw Prism user UUID in session cookie (long max-age). Insecure — never enable in production.
    dev_simple_session_cookie: bool = False
    # Dev-only: if PRISM_SESSION_SECRET is empty and OIDC is configured, generate a random secret at startup
    # (no .env line). Lost on restart; unsafe with multiple uvicorn workers — never use in production.
    ephemeral_session_secret: bool = False

    @property
    def oidc_configured(self) -> bool:
        return bool(
            self.oidc_issuer.strip()
            and self.oidc_client_id.strip()
            and self.oidc_client_secret.strip()
            and self.oidc_redirect_uri.strip()
        )

    @model_validator(mode="after")
    def require_session_secret_when_oidc(self) -> "AdminAuthSettings":
        if not self.oidc_configured:
            return self
        if self.session_secret.strip():
            return self
        if self.ephemeral_session_secret or self.dev_simple_session_cookie:
            return self
        raise ValueError(
            "PRISM_SESSION_SECRET is required when OIDC settings are set. "
            "For local CIAM debugging you may set PRISM_EPHEMERAL_SESSION_SECRET=true or "
            "PRISM_DEV_SIMPLE_SESSION_COOKIE=true to generate one at startup (dev only)."
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
        if self.oidc_configured and not self.session_secret.strip():
            if not (self.ephemeral_session_secret or self.dev_simple_session_cookie):
                missing.append("PRISM_SESSION_SECRET")
        return missing

    def diagnostic_dict(self) -> dict[str, str | bool | int]:
        """Non-secret snapshot for logs (never includes client_secret or session_secret values)."""

        issuer = self.oidc_issuer.strip()
        redirect = self.oidc_redirect_uri.strip()
        return {
            "oidc_configured": self.oidc_configured,
            "admin_auth_disabled": self.admin_auth_disabled,
            "dev_simple_session_cookie": self.dev_simple_session_cookie,
            "ephemeral_session_secret": self.ephemeral_session_secret,
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
    if (
        settings.oidc_configured
        and not settings.session_secret.strip()
        and (
            settings.ephemeral_session_secret
            or settings.dev_simple_session_cookie
        )
    ):
        logger.warning(
            "PRISM_SESSION_SECRET empty: generating ephemeral secret for OIDC state signing "
            "(lost on restart; use a single uvicorn worker; set PRISM_SESSION_SECRET for persistence). "
            "Dev-only paths: PRISM_EPHEMERAL_SESSION_SECRET or PRISM_DEV_SIMPLE_SESSION_COOKIE."
        )
        return settings.model_copy(
            update={"session_secret": secrets.token_hex(32)}
        )
    return settings
