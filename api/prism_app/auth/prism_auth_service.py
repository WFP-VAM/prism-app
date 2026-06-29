"""Load OIDC-mapped users and permission codes from the alerts DB."""

from __future__ import annotations

import logging
from typing import Any, Mapping
from uuid import UUID

from prism_app.auth.admin_settings import DEFAULT_OIDC_PROVIDER_ID
from prism_app.auth.oidc_id_token_profile import IdTokenProfileClaims
from prism_app.database.permission_model import Permission, UserPermission
from prism_app.database.user_model import User, UserStatus
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def ensure_user_for_oidc(
    engine: Engine,
    *,
    auth_provider: str,
    ciam_sub: str,
    claims: Mapping[str, Any],
) -> tuple[User | None, set[str]]:
    """Load user by provider + OIDC ``sub``; JIT-insert an active row when missing.

    Subsequent logins refresh ``email`` / ``name`` from the same OIDC claims.
    New users start with zero ``user_permissions`` until granted in Admin.

    Raises:
        ValueError: if ``auth_provider`` or ``ciam_sub`` is missing or whitespace-only.
    """

    trimmed_provider = (auth_provider or "").strip() or DEFAULT_OIDC_PROVIDER_ID
    trimmed_sub = (ciam_sub or "").strip()
    if not trimmed_sub:
        raise ValueError("ciam_sub is required and cannot be empty")

    email, display_name = IdTokenProfileClaims.from_claims(claims).to_user_fields()

    with Session(engine) as session:
        try:
            user = session.scalars(
                select(User).where(
                    User.auth_provider == trimmed_provider,
                    User.ciam_sub == trimmed_sub,
                )
            ).first()

            if user is None:
                session.add(
                    User(
                        auth_provider=trimmed_provider,
                        ciam_sub=trimmed_sub,
                        email=email,
                        name=display_name,
                    )
                )
                session.commit()
                user = session.scalars(
                    select(User).where(
                        User.auth_provider == trimmed_provider,
                        User.ciam_sub == trimmed_sub,
                    )
                ).first()
                if user:
                    logger.info(
                        "JIT user created uid=%s provider=%s",
                        user.id,
                        trimmed_provider,
                    )
            else:
                if user.email != email or user.name != display_name:
                    user.email = email
                    user.name = display_name
                    session.add(user)
                    session.commit()
                    session.refresh(user)
        except IntegrityError:
            session.rollback()
            logger.warning(
                "JIT user concurrent insert; reloading by provider+ciam_sub — %s %s",
                trimmed_provider,
                trimmed_sub[:80],
            )

    return load_user_and_permissions(
        engine,
        auth_provider=trimmed_provider,
        ciam_sub=trimmed_sub,
    )


def load_user_and_permissions(
    engine: Engine,
    *,
    user_id: UUID | None = None,
    auth_provider: str | None = None,
    ciam_sub: str | None = None,
) -> tuple[User | None, set[str]]:
    """Return the user row and set of permission codes (empty if missing user).

    Provide ``user_id`` or both ``auth_provider`` and ``ciam_sub``.
    """
    if user_id is not None:
        if auth_provider is not None or ciam_sub is not None:
            raise ValueError("Provide user_id or (auth_provider, ciam_sub), not both")
    elif ciam_sub is None:
        raise ValueError("Provide user_id or (auth_provider, ciam_sub)")

    lookup_provider = (
        (auth_provider or "").strip() or DEFAULT_OIDC_PROVIDER_ID
        if ciam_sub is not None
        else None
    )
    trimmed_sub = ciam_sub.strip() if ciam_sub is not None else None

    with Session(engine) as session:
        if user_id is not None:
            user = session.get(User, user_id)
        else:
            assert lookup_provider is not None and trimmed_sub is not None
            user = session.scalars(
                select(User).where(
                    User.auth_provider == lookup_provider,
                    User.ciam_sub == trimmed_sub,
                )
            ).first()
        if user is None:
            return None, set()
        rows = session.execute(
            select(Permission.code)
            .join(UserPermission, UserPermission.permission_id == Permission.id)
            .where(UserPermission.user_id == user.id)
        ).all()
        codes = {r[0] for r in rows}
        return user, codes


def touch_last_login(engine: Engine, user_id: UUID) -> None:
    from datetime import datetime, timezone

    with Session(engine) as session:
        user = session.get(User, user_id)
        if user is None:
            return
        user.last_login_at = datetime.now(timezone.utc)
        session.add(user)
        session.commit()


def is_active(user: User | None) -> bool:
    if user is None or user.status is None:
        return False
    s = user.status
    if isinstance(s, str):
        return s == UserStatus.active.value
    return s == UserStatus.active
