"""Read the served AA drought CSV for a country (read API).

Serves the ``published`` dataset by default; staging frontends opt in to the
``staging`` dataset via ``include_staging``. At most one published dataset per
country exists (enforced by a partial unique index), so there is no merge step —
the most recently updated served row wins.
"""

from __future__ import annotations

from prism_app.database.aa_drought_model import AaDroughtDatasetModel, AaDroughtStatus
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlmodel import col


def served_statuses(include_staging: bool) -> list[AaDroughtStatus]:
    """AA drought statuses exposed by the read API.

    ``published`` is always served; ``staging`` is added only for staging
    frontends. ``draft`` and ``archived`` are never served.
    """
    statuses = [AaDroughtStatus.published]
    if include_staging:
        statuses.append(AaDroughtStatus.staging)
    return statuses


def get_served_aa_drought_csv(
    engine: Engine, country: str, include_staging: bool = False
) -> str | None:
    """Return the raw CSV text served for ``country``, or ``None`` if there is none.

    When ``include_staging`` is set and a staging dataset exists, it takes
    precedence over the published one so reviewers preview the staged file.
    """
    SessionLocal = sessionmaker(engine, class_=Session, expire_on_commit=False)
    with SessionLocal() as session:
        rows = list(
            session.scalars(
                select(AaDroughtDatasetModel)
                .where(col(AaDroughtDatasetModel.country) == country)
                .where(
                    col(AaDroughtDatasetModel.status).in_(
                        served_statuses(include_staging)
                    )
                )
                .order_by(col(AaDroughtDatasetModel.updated_at).desc())
            ).all()
        )
    if not rows:
        return None
    if include_staging:
        for row in rows:
            if row.status == AaDroughtStatus.staging:
                return row.csv_content
    return rows[0].csv_content
