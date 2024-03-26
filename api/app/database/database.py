"""Alert database access functions."""

import base64
import hashlib
import logging
import os
from os import getenv
from typing import List, Optional

from app.database.alert_model import AlertModel
from app.database.user_info_model import UserInfoModel
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm.session import Session
from sqlalchemy.sql import text
from sqlalchemy.sql.expression import ColumnElement

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_URI = getenv(
    "PRISM_ALERTS_DATABASE_URL"
) or "postgresql://{user}:{password}@{host}:{port}/{database}".format(
    host=getenv("POSTGRES_HOST", "host.docker.internal"),
    port=getenv("POSTGRES_PORT", "54321"),
    database=getenv("POSTGRES_DB", "postgres"),
    user=getenv("POSTGRES_USER", "postgres"),
    password=getenv("POSTGRES_PASSWORD"),
)


class AlertsDataBase:
    """
    Alerts Database.

    This object provides the methods that will be required to connect to
    database that stores the alerts threshold and layers, etc.
    """

    def __init__(self):
        """Alerts Database initializer."""
        self.active = False
        try:
            # temporary engine with short timeout
            temp_eng = create_engine(DB_URI, connect_args={"connect_timeout": 3})
            with Session(temp_eng) as session:
                session.query(text("1")).from_statement(text("SELECT 1")).all()

            # open main session
            _eng = create_engine(DB_URI)
            self.session: Session = sessionmaker(_eng)()
            self.active = True
            logger.info("Alerts DB connection is initialized.")
        except SQLAlchemyError as err:
            logger.error("Alerts DB connection failed: %s", err.__cause__)

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

    def read(self, expr: ColumnElement) -> List[AlertModel]:
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
            alert.active = False  # type: ignore
            self.session.commit()
            deactivation_successful = True
        except Exception as e:
            self.session.rollback()
            logger.error(f"Failed to deactivate alert: {e}")
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
            logger.error(f"Failed to delete alert: {e}")
        finally:
            self.session.close()

        return delete_successful


class AuthDataBase:
    """
    Authentication Database.

    This object provides the methods that will be required to connect to
    database that stores the user info for access control.
    """

    def __init__(self):
        """Authentication Database initializer."""
        self.active = False
        try:
            # temporary engine with short timeout
            temp_eng = create_engine(DB_URI, connect_args={"connect_timeout": 3})
            with Session(temp_eng) as session:
                session.query(text("1")).from_statement(text("SELECT 1")).all()

            # open main session
            _eng = create_engine(DB_URI)
            self.session: Session = sessionmaker(_eng)()
            self.active = True
            logger.info("Auth DB connection is initialized.")
        except SQLAlchemyError as err:
            logger.error("Auth DB connection failed: %s", err.__cause__)

    def create_user(self, user: UserInfoModel):
        """Create user with hashed password."""
        if user.salt != "false":
            salt = os.urandom(32)
            key = hashlib.pbkdf2_hmac(
                "sha256",  # The hash digest algorithm for HMAC
                user.password.encode("utf-8"),  # Convert the password to bytes
                salt,  # Provide the salt
                100000,  # It is recommended to use at least 100,000 iterations of SHA-256
            )
            # Bytes encoded to Base64 but still in byte format
            encoded_salt = base64.b64encode(salt)
            encoded_key = base64.b64encode(key)
        else:
            encoded_salt = user.salt.encode("utf-8")
            encoded_key = user.password.encode("utf-8")
        db_user = UserInfoModel(
            username=user.username,
            password=encoded_key.decode("utf-8"),
            salt=encoded_salt.decode("utf-8"),
            access=user.access or {},
        )
        try:
            self.session.add(db_user)
            self.session.commit()
        except SQLAlchemyError as error:
            self.session.rollback()
            raise error
        finally:
            self.session.close()

        return db_user

    def read(self, expr: ColumnElement) -> List[UserInfoModel]:
        """
        Return all the rows that match expression.

        :param expr: An expression that builds a filter.
        :return: A list of ORM object.
        """
        return self.session.query(AlertModel).filter(expr).all()

    def get_by_username(self, username: str) -> Optional[UserInfoModel]:
        """
        Return one alert matching the provided id.

        :param username: The username of the wanted user entity
        :return: A user entity or None if no entity was found
        """
        try:
            return (
                self.session.query(UserInfoModel).filter_by(username=username).first()
            )
        except SQLAlchemyError as error:
            self.session.rollback()
            logger.error("An error occured in get_by_username.")
            logger.error(error, exc_info=True)
        return self.session.query(UserInfoModel).filter_by(username=username).first()


# Local test
if __name__ == "__main__":
    alert_db = AlertsDataBase()
    alerts = alert_db.session.query(AlertModel).all()
    for row in alert_db.read(AlertModel.alert_name.startswith("alert")):
        print(row.email)
