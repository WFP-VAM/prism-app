"""Alert database access functions."""
import logging
from os import getenv

from app.database.alert_model import AlertModel

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_URI = getenv('DATABASE_URL') or \
    'postgresql://{user}:{password}@{host}:{port}/{database}' \
    .format(
        host=getenv('POSTGRES_HOST', 'alerting-db'),
        port=getenv('POSTGRES_PORT', 5432),
        database=getenv('POSTGRES_DB', 'postgres'),
        user=getenv('POSTGRES_USER', 'postgres'),
        password=getenv('POSTGRES_PASSWORD')
    )


class AlertsDataBase:
    """
    Alerts Database.

    This object provides the methods that will be required to connect to
    database that stores the alerts threshold and layers, etc.
    """

    def __init__(self):
        """Alerts Database initializer."""
        _eng = create_engine(DB_URI)
        self.session = sessionmaker(_eng)()
        logger.info('DB connection is initialized.')

    def write(self, alert: AlertModel):
        """Write an alert to the alerts table."""
        try:
            self.session.add(alert)
            self.session.commit()
        except Exception as e:
            self.session.rollback()
            raise e
        finally:
            self.session.close()

    def readall(self) -> list:
        """
        Get all the rows from this table.

        :return: A list of ORM object.
        """
        return self.session.query(AlertModel).all()

    def read(self, expr: bool) -> list:
        """
        Return all the rows that match expression.

        :param expr: An expression that builds a filter.
        :return: A list of ORM object.
        """
        return self.session.query(AlertModel).filter(expr).all()


# Local test
if __name__ == '__main__':
    alert_db = AlertsDataBase()
    alerts = alert_db.session.query(AlertModel).all()
    for row in alert_db.read(AlertModel.alert_name.startswith('alert')):
        print(row.email)
