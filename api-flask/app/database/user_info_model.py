"""Alert database model."""
import datetime
import json
import logging

from sqlalchemy import JSON, TIMESTAMP, Column, DateTime, Identity, Integer, String
from sqlalchemy.ext.declarative import DeclarativeMeta, declarative_base
from sqlalchemy.sql.sqltypes import Boolean

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base = declarative_base()


class UserInfo(Base):  # type: ignore
    """Alert ORM that defines a table."""

    __tablename__ = "user_info"
    id = Column("id", Integer, Identity(start=1, cycle=True), primary_key=True)
    username = Column("username", String, nullable=False)
    password = Column("password", String, nullable=False)
    salt = Column("salt", String, nullable=False)
    access = Column("access", JSON, nullable=True)
    details = Column("details", String)
    created_at = Column("created_at", DateTime, default=datetime.datetime.now)
