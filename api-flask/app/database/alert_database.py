"""Alert database access functions."""
import logging
from os import getenv
from typing import List

from app.database.alert_model import AlertModel

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm.session import Session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_URI = getenv('DATABASE_URL') or \
    'postgresql://{user}:{password}@{host}:{port}/{database}' \
    .format(
        host=getenv('POSTGRES_HOST', 'alerting-db'),
        port=getenv('POSTGRES_PORT', '5432'),
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
        self.session: Session = sessionmaker(_eng)()
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

    def readall(self) -> List[AlertModel]:
        """
        Get all the rows from this table.

        :return: A list of ORM object.
        """
        return self.session.query(AlertModel).all()

    def read(self, expr: bool) -> List[AlertModel]:
        """
        Return all the rows that match expression.

        :param expr: An expression that builds a filter.
        :return: A list of ORM object.
        """
        return self.session.query(AlertModel).filter(expr).all()

    def readone(self, id: int):
        """
        Return one alert matching the provided id.

        :param id: The id of the wanted alert entity
        :return: An alert entity or None if no entity was found
        """
        return self.session.query(AlertModel).filter_by(id=id).first()

    def deactivate(self, alert: AlertModel):
        """
        Deactivate an alert from the database.

        :param alert: An existing AlertModel element.
        :return: success boolean.
        """
        deactivation_successful = False
        try:
            alert.active = False
            self.session.commit()
            deactivation_successful = True
        except Exception as e:
            self.session.rollback()
            logger.error(f'Failed to deactivate alert: {e}')
        finally:
            self.session.close()

        return deactivation_successful

    def delete(self, alert: AlertModel) -> bool:
        """
        Delete an alert from the database.

        :param alert: An existing AlertModel element.
        :return: success boolean.
        """
        delete_successful = False
        try:
            self.session.delete(alert)
            self.session.commit()
            delete_successful = True
        except Exception as e:
            self.session.rollback()
            logger.error(f'Failed to delete alert: {e}')
        finally:
            self.session.close()

        return delete_successful


# Local test
if __name__ == '__main__':
    alert_db = AlertsDataBase()
    alerts = alert_db.session.query(AlertModel).all()
    for row in alert_db.read(AlertModel.alert_name.startswith('alert')):
        print(row.email)
