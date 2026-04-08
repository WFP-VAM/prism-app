"""Load CIAM-mapped users and permission codes from the alerts DB."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from prism_app.database.permission_model import Permission, UserPermission
from prism_app.database.prism_user_model import PrismUser, PrismUserStatus

if TYPE_CHECKING:
    pass


def load_user_and_permissions(
    engine: Engine, user_id: UUID
) -> tuple[PrismUser | None, set[str]]:
    """Return the user row and set of permission codes (empty if missing user)."""
    with Session(engine) as session:
        user = session.get(PrismUser, user_id)
        if user is None:
            return None, set()
        rows = session.execute(
            select(Permission.code)
            .join(UserPermission, UserPermission.permission_id == Permission.id)
            .where(UserPermission.user_id == user_id)
        ).all()
        codes = {r[0] for r in rows}
        return user, codes


def load_user_by_ciam_sub(
    engine: Engine, ciam_sub: str
) -> tuple[PrismUser | None, set[str]]:
    with Session(engine) as session:
        user = session.scalars(
            select(PrismUser).where(PrismUser.ciam_sub == ciam_sub)
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
        user = session.get(PrismUser, user_id)
        if user is None:
            return
        user.last_login_at = datetime.now(timezone.utc)
        session.add(user)
        session.commit()


def is_active(user: PrismUser | None) -> bool:
    if user is None or user.status is None:
        return False
    s = user.status
    if isinstance(s, str):
        return s == PrismUserStatus.active.value
    return s == PrismUserStatus.active
