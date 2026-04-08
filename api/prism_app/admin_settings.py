"""Environment-backed settings for admin OIDC and session cookies."""

from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    session_secret: str = ""
    session_cookie_name: str = "prism_session"
    session_cookie_secure: bool = False
    session_cookie_samesite: str = "lax"
    session_ttl_seconds: int = 3600
    oidc_state_cookie_name: str = "prism_oidc_state"
    oidc_state_ttl_seconds: int = 600

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

    @model_validator(mode="after")
    def require_session_secret_when_oidc(self) -> "AdminAuthSettings":
        if self.oidc_configured and not self.session_secret.strip():
            raise ValueError(
                "PRISM_SESSION_SECRET is required when OIDC settings are set."
            )
        return self


@lru_cache
def get_admin_auth_settings() -> AdminAuthSettings:
    return AdminAuthSettings()
