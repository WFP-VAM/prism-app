"""Read merged dashboard config arrays for the public (published-only) API."""

from __future__ import annotations

from typing import Any

from prism_app.dashboard.util import omit_none_keys
from prism_app.database.dashboard_model import DashboardModel, DashboardStatus
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlmodel import col


def merge_published_dashboard_rows_for_country(
    engine: Engine, country: str
) -> list[Any]:
    """
    Return the combined top-level ``dashboard.json`` array for a deployment.

    Merges each published row's ``config`` in ``title`` order. Each row's
    ``config`` is a JSON list of dashboard row objects, or a single object for
    legacy rows.
    """
    SessionLocal = sessionmaker(engine, class_=Session, expire_on_commit=False)
    with SessionLocal() as session:
        orm_rows = list(
            session.scalars(
                select(DashboardModel)
                .where(col(DashboardModel.deployment) == country)
                .where(col(DashboardModel.status) == DashboardStatus.published)
                .order_by(col(DashboardModel.title))
            ).all()
        )
    merged: list[Any] = []
    for row in orm_rows:
        cfg = omit_none_keys(row.config)
        if isinstance(cfg, list):
            merged.extend(cfg)
            continue

        if isinstance(cfg, dict):
            merged.append(
                {
                    "title": row.title,
                    "path": row.slug,
                    **cfg,
                }
            )
            continue

        merged.append(cfg)
    return merged
