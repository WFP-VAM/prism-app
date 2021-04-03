import datetime

from sqlalchemy import Integer, Identity, JSON, TIMESTAMP
from sqlalchemy import Column, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class AlertModel(Base):
    """
    Alert ORM that defines a table.
    """
    __tablename__ = 'alert'
    id = Column('id', Integer, Identity(start=0, cycle=True), primary_key=True)
    email = Column('email', String, nullable=False)
    alert_name = Column('alert_name', String)
    alert_config = Column('alert_config', JSON, nullable=False)
    min = Column('min', Integer, nullable=False)
    max = Column('max', Integer, nullable=False)
    zones = Column('zones', JSON, nullable=False)
    created_at = Column('created_at', TIMESTAMP, nullable=False, default=datetime.datetime.now())
    updated_at = Column('updated_at', TIMESTAMP, nullable=False, default=datetime.datetime.now())
    last_triggered = Column('last_triggered', TIMESTAMP, nullable=False)
