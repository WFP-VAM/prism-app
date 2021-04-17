from psycopg2 import OperationalError
from sqlalchemy.orm import sessionmaker
import logging
from sqlalchemy import create_engine
from os import getenv

from app.database.alert_model import AlertModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_URI = 'postgresql://{user}:{password}@{host}:{port}/{database}'.format(host=getenv('POSTGRES_HOST'),
                                                                          port=5432,
                                                                          database=getenv('POSTGRES_DB'),
                                                                          user=getenv('POSTGRES_USER'),
                                                                          password=getenv('POSTGRES_PASSWORD'))


class AlertsDataBase:
    """
    This object provides the methods that will be required to connect to
    database that stores the alerts threshold and layers, etc.
    """

    def __init__(self):
        _eng = create_engine(DB_URI)
        self.session = sessionmaker(_eng)()
        logger.info('DB connection is initialized, database: {}.'.format(getenv('POSTGRES_DB')))

        from app.database.alert_model import create_all
        create_all(_eng)


    def write(self, alert: AlertModel):
        try:
            self.session.add(alert)
            self.session.commit()

        except OperationalError:
            self.session.rollback()
            raise

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
