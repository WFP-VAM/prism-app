"""Session factory for map_export_jobs (same DB as alerts)."""

from __future__ import annotations

from collections.abc import Generator

from prism_app.database.database import DB_URI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import Session

_session_factory: sessionmaker | None = None


def _get_session_factory() -> sessionmaker:
    global _session_factory
    if _session_factory is None:
        engine = create_engine(DB_URI)
        _session_factory = sessionmaker(engine, class_=Session, expire_on_commit=False)
    return _session_factory


def get_export_jobs_session_factory() -> sessionmaker:
    """Shared sessionmaker for API routes and the export map worker."""
    return _get_session_factory()


def get_export_jobs_session() -> Generator[Session, None, None]:
    factory = _get_session_factory()
    session = factory()
    try:
        yield session
    finally:
        session.close()
