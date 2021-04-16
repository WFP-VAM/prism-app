"""Alert database model."""
import datetime

from sqlalchemy import Column, Identity, Integer, JSON, String, TIMESTAMP
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class AlertModel(Base):
    """Alert ORM that defines a table."""

    __tablename__ = 'alert'
    id = Column('id', Integer, Identity(start=0, cycle=True), primary_key=True)
    email = Column('email', String, nullable=False)
    alert_name = Column('alert_name', String)
    alert_config = Column('alert_config', JSON, nullable=False)
    min = Column('min', Integer)
    max = Column('max', Integer)
    zones = Column('zones', JSON, nullable=False)
    created_at = Column(
        'created_at',
        TIMESTAMP,
        nullable=False,
        default=datetime.datetime.now()
    )
    updated_at = Column(
        'updated_at',
        TIMESTAMP,
        nullable=False,
        default=datetime.datetime.now()
    )
    last_triggered = Column('last_triggered', TIMESTAMP, nullable=False)
