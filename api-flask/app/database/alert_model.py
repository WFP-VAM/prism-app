import datetime
import logging
from sqlalchemy import Integer, Identity, JSON, TIMESTAMP
from sqlalchemy import Column, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.declarative import DeclarativeMeta

from flask import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base = declarative_base()


class AlertModel(Base):
    """
    Alert ORM that defines a table.
    """
    __tablename__ = 'alert'
    id = Column('id', Integer, Identity(start=1, cycle=True), primary_key=True)
    email = Column('email', String, nullable=False)
    alert_name = Column('alert_name', String)
    alert_config = Column('alert_config', JSON, nullable=False)
    min = Column('min', Integer, nullable=False)
    max = Column('max', Integer, nullable=False)
    zones = Column('zones', JSON, nullable=False)
    created_at = Column('created_at', TIMESTAMP, nullable=False, default=datetime.datetime.now())
    updated_at = Column('updated_at', TIMESTAMP, nullable=False, default=datetime.datetime.now())
    last_triggered = Column('last_triggered', TIMESTAMP, nullable=True)


class AlchemyEncoder(json.JSONEncoder):

    def default(self, obj):
        if isinstance(obj.__class__, DeclarativeMeta):
            # an SQLAlchemy class
            fields = {}
            for field in [x for x in dir(obj) if not x.startswith('_') and x != 'metadata']:
                data = obj.__getattribute__(field)
                try:
                    json.dumps(data) # this will fail on non-encodable values, like other classes
                    fields[field] = data
                except TypeError:
                    fields[field] = None
            # a json-encodable dict
            return fields

        return json.JSONEncoder.default(self, obj)


def create_all(engine):
    """
    Creating a table using current schema if the table is not there.
    """
    AlertModel.__table__.metadata.create_all(engine)
    logger.info('Table is ready to use, table name: {}.'.format(AlertModel.__tablename__))


# TODO: use migration script instead of dropping all tables
def drop_all(engine):
    """
    Drop tables, this method is used for local testing.
    """
    AlertModel.__table__.metadata.drop_all(engine)
    logger.info('Dropped all tables.')