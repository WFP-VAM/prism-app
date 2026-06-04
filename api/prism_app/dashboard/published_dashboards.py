"""Read merged dashboard config arrays for the dashboard read API.

Serves ``published`` rows by default; staging frontends opt in to also seeing
``staging`` rows via ``include_staging``.
"""

from __future__ import annotations

from typing import Any

from prism_app.dashboard.util import omit_none_keys
from prism_app.database.dashboard_model import DashboardModel, DashboardStatus
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlmodel import col


def served_statuses(include_staging: bool) -> list[DashboardStatus]:
    """Dashboard statuses exposed by the read API.

    ``published`` is always served; ``staging`` is added only for staging
    frontends. ``draft`` and ``archived`` are never served.
    """
    statuses = [DashboardStatus.published]
    if include_staging:
        statuses.append(DashboardStatus.staging)
    return statuses


def merge_published_dashboard_rows_for_country(
    engine: Engine, country: str, include_staging: bool = False
) -> list[Any]:
    """
    Return the combined top-level ``dashboard.json`` array for a country.

    Merges each served row's ``config`` in ``title`` order. Each row's
    ``config`` is a JSON list of dashboard row objects, or a single object for
    legacy rows.

    By default only ``published`` rows are served. When ``include_staging`` is
    true, ``staging`` rows are served alongside published ones (for staging
    frontends previewing dashboards before they go public).
    """
    SessionLocal = sessionmaker(engine, class_=Session, expire_on_commit=False)
    with SessionLocal() as session:
        orm_rows = list(
            session.scalars(
                select(DashboardModel)
                .where(col(DashboardModel.country) == country)
                .where(col(DashboardModel.status).in_(served_statuses(include_staging)))
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
                    "path": row.path,
                    **cfg,
                }
            )
            continue

        merged.append(cfg)
    return merged
