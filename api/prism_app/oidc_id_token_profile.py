"""Pydantic parse of OIDC ID token identity claims → Prism ``users`` profile fields."""

from __future__ import annotations

from typing import Annotated, Any, Mapping

from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    EmailStr,
    TypeAdapter,
    ValidationError,
)


def _nullable_trimmed_str(v: Any) -> str | None:
    if isinstance(v, str):
        s = v.strip()
        return s if s else None
    return None


_TrimmedOptionalStr = Annotated[
    str | None,
    BeforeValidator(_nullable_trimmed_str),
]

_email_validator = TypeAdapter(EmailStr)


class IdTokenProfileClaims(BaseModel):
    """Claims we read from CIAM/OpenID tokens for Prism user profile.

    ``extra='ignore'`` drops private / unknown JWT keys. Values that are not strings
    become ``None``.
    """

    model_config = ConfigDict(extra="ignore")

    email: _TrimmedOptionalStr = None
    preferred_username: _TrimmedOptionalStr = None
    name: _TrimmedOptionalStr = None
    given_name: _TrimmedOptionalStr = None
    family_name: _TrimmedOptionalStr = None

    @classmethod
    def from_claims(cls, claims: Mapping[str, Any]) -> IdTokenProfileClaims:
        return cls.model_validate(dict(claims))

    def prism_mailbox(self) -> str | None:
        """First RFC-valid mailbox from ``email`` or ``preferred_username``."""

        for candidate in (self.email, self.preferred_username):
            if not candidate:
                continue
            try:
                return str(_email_validator.validate_python(candidate))
            except ValidationError:
                continue
        return None

    def prism_display_name(self) -> str | None:
        if self.name:
            return self.name
        parts = [p for p in (self.given_name, self.family_name) if p]
        return " ".join(parts) if parts else None

    def to_prism_user_fields(self) -> tuple[str | None, str | None]:
        """``(mailbox, display_name)`` for ``users.email`` / ``users.name``."""
        return self.prism_mailbox(), self.prism_display_name()
