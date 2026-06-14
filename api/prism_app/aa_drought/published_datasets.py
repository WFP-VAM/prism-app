"""Read the served AA drought CSV for a country (read API).

Serves the ``published`` dataset by default; staging frontends opt in to the
``staging`` dataset via ``include_staging``. At most one published dataset per
country exists (enforced by a partial unique index).
"""

from __future__ import annotations

from prism_app.database.aa_drought_model import AaDroughtDatasetModel, AaDroughtStatus
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlmodel import col


def served_statuses(include_staging: bool) -> list[AaDroughtStatus]:
    """AA drought statuses exposed by the read API."""
    statuses = [AaDroughtStatus.published]
    if include_staging:
        statuses.append(AaDroughtStatus.staging)
    return statuses


def _latest_csv_for_status(
    session: Session, country: str, status: AaDroughtStatus
) -> str | None:
    row = session.scalar(
        select(AaDroughtDatasetModel)
        .where(col(AaDroughtDatasetModel.country) == country)
        .where(col(AaDroughtDatasetModel.status) == status)
        .order_by(col(AaDroughtDatasetModel.updated_at).desc())
        .limit(1)
    )
    return row.csv_content if row else None


def get_served_aa_drought_csv(
    engine: Engine, country: str, include_staging: bool = False
) -> str | None:
    """Return the raw CSV text served for ``country``, or ``None`` if there is none."""
    SessionLocal = sessionmaker(engine, class_=Session, expire_on_commit=False)
    with SessionLocal() as session:
        if include_staging:
            staging_csv = _latest_csv_for_status(
                session, country, AaDroughtStatus.staging
            )
            if staging_csv is not None:
                return staging_csv
        return _latest_csv_for_status(session, country, AaDroughtStatus.published)
