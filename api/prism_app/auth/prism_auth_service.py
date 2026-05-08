"""Load CIAM-mapped users and permission codes from the alerts DB."""

from __future__ import annotations

import logging
from typing import Any, Mapping
from uuid import UUID

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
    ciam_sub: str,
    claims: Mapping[str, Any],
) -> tuple[User | None, set[str]]:
    """Load user by CIAM ``sub``; JIT-insert an active row when missing.

    Subsequent logins refresh ``email`` / ``name`` from the same OIDC claims (CIAM-driven profile).
    New users start with zero ``user_permissions`` until granted in Admin.

    Raises:
        ValueError: if ``ciam_sub`` is missing or whitespace-only (caller should fail the sign-in).
    """

    trimmed_sub = (ciam_sub or "").strip()
    if not trimmed_sub:
        raise ValueError("ciam_sub is required and cannot be empty")

    email, display_name = IdTokenProfileClaims.from_claims(claims).to_user_fields()

    with Session(engine) as session:
        try:
            user = session.scalars(
                select(User).where(User.ciam_sub == trimmed_sub)
            ).first()

            if user is None:
                session.add(
                    User(
                        ciam_sub=trimmed_sub,
                        email=email,
                        name=display_name,
                    )
                )
                session.commit()
                user = session.scalars(
                    select(User).where(User.ciam_sub == trimmed_sub)
                ).first()
                if user:
                    logger.info("JIT user created uid=%s", user.id)
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
                "JIT user concurrent insert; reloading by ciam_sub — %s",
                trimmed_sub[:80],
            )

    return load_user_and_permissions(engine, ciam_sub=trimmed_sub)


def load_user_and_permissions(
    engine: Engine,
    *,
    user_id: UUID | None = None,
    ciam_sub: str | None = None,
) -> tuple[User | None, set[str]]:
    """Return the user row and set of permission codes (empty if missing user).

    Either ``user_id`` or ``ciam_sub`` must be provided.
    """
    if (user_id is None) == (ciam_sub is None):
        raise ValueError("Provide exactly one of user_id or ciam_sub")

    with Session(engine) as session:
        if user_id is not None:
            user = session.get(User, user_id)
        else:
            user = session.scalars(
                select(User).where(User.ciam_sub == ciam_sub)
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
