"""Tests for AA drought published-dataset read helpers."""

import pytest
from prism_app.aa_drought.published_datasets import (
    get_served_aa_drought_csv,
    served_statuses,
)
from prism_app.database.aa_drought_model import (
    AaDroughtCountry,
    AaDroughtDatasetModel,
    AaDroughtStatus,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import Session


@pytest.fixture
def aa_drought_sqlite_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    for column in AaDroughtDatasetModel.__table__.columns:
        column.server_default = None
    AaDroughtDatasetModel.__table__.create(engine)
    return engine


def test_served_statuses_published_only_by_default() -> None:
    assert served_statuses(include_staging=False) == [AaDroughtStatus.published]


def test_served_statuses_includes_staging_when_requested() -> None:
    statuses = served_statuses(include_staging=True)
    assert AaDroughtStatus.published in statuses
    assert AaDroughtStatus.staging in statuses
    assert AaDroughtStatus.draft not in statuses
    assert AaDroughtStatus.archived not in statuses


def test_get_served_aa_drought_csv_reads_published_row(
    aa_drought_sqlite_engine,
) -> None:
    csv_text = "district,index\nA,B\n"
    SessionLocal = sessionmaker(
        aa_drought_sqlite_engine, class_=Session, expire_on_commit=False
    )
    with SessionLocal() as session:
        session.add(
            AaDroughtDatasetModel(
                country=AaDroughtCountry.malawi,
                status=AaDroughtStatus.published,
                csv_content=csv_text,
            )
        )
        session.commit()

    assert get_served_aa_drought_csv(aa_drought_sqlite_engine, "malawi") == csv_text


def test_get_served_aa_drought_csv_prefers_staging_when_requested(
    aa_drought_sqlite_engine,
) -> None:
    SessionLocal = sessionmaker(
        aa_drought_sqlite_engine, class_=Session, expire_on_commit=False
    )
    with SessionLocal() as session:
        session.add(
            AaDroughtDatasetModel(
                country=AaDroughtCountry.malawi,
                status=AaDroughtStatus.published,
                csv_content="published\n",
            )
        )
        session.add(
            AaDroughtDatasetModel(
                country=AaDroughtCountry.malawi,
                status=AaDroughtStatus.staging,
                csv_content="staging\n",
            )
        )
        session.commit()

    assert (
        get_served_aa_drought_csv(
            aa_drought_sqlite_engine,
            "malawi",
            include_staging=True,
        )
        == "staging\n"
    )
