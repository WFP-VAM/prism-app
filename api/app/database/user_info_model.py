"""UserInfo database model."""
import datetime
import logging

from sqlalchemy import JSON, TIMESTAMP, Column, DateTime, Identity, Integer, String
from sqlalchemy.ext.declarative import DeclarativeMeta, declarative_base
from sqlalchemy.sql.sqltypes import Boolean

logger = logging.getLogger(__name__)

Base = declarative_base()


class UserInfoModel(Base):  # type: ignore
    """UserInfo ORM that defines a table to hold auth data."""

    __tablename__ = "user_info"
    id = Column("id", Integer, Identity(start=1, cycle=True), primary_key=True)
    username = Column("username", String, nullable=False)
    password = Column("password", String, nullable=False)
    salt = Column("salt", String, nullable=True)
    access = Column("access", JSON, nullable=True)
    deployment = Column("deployment", String, nullable=True)
    organization = Column("organization", String, nullable=True)
    email = Column("email", String, nullable=True)
    details = Column("details", String)
    created_at = Column("created_at", DateTime, default=datetime.datetime.now)
