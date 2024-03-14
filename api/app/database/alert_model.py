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


class AlertModel(Base):  # type: ignore
    """Alert ORM that defines a table."""

    __tablename__ = "alert"
    id = Column("id", Integer, Identity(start=1, cycle=True), primary_key=True)
    email = Column("email", String, nullable=False)
    prism_url = Column("prism_url", String, nullable=False)
    alert_name = Column("alert_name", String)
    alert_config = Column("alert_config", JSON, nullable=False)
    min = Column("min", Integer)
    max = Column("max", Integer)
    zones = Column("zones", JSON, nullable=False)
    active = Column("active", Boolean, nullable=False, default=True)
    created_at = Column("created_at", DateTime, default=datetime.datetime.now)
    updated_at = Column(
        "updated_at",
        DateTime,
        default=datetime.datetime.now,
        onupdate=datetime.datetime.now,
    )
    last_triggered = Column("last_triggered", TIMESTAMP, nullable=True)


class AlchemyEncoder(json.JSONEncoder):
    """An utility class that translates ORM model to JSON."""

    def default(self, obj):
        """Overwrite JSONEncoder's default method."""
        if isinstance(obj.__class__, DeclarativeMeta):
            # an SQLAlchemy class
            fields = {}
            for field in [
                x for x in dir(obj) if not x.startswith("_") and x != "metadata"
            ]:
                data = obj.__getattribute__(field)
                try:
                    json.dumps(
                        data
                    )  # this will fail on non-encodable values, like other classes
                    fields[field] = data
                except TypeError:
                    fields[field] = None
            # a json-encodable dict
            return fields

        return json.JSONEncoder.default(self, obj)
