"""Alert database access functions."""

import base64
import hashlib
import logging
import os
from os import getenv
from typing import List, Optional

from prism_app.database.alert_model import AlertModel
from prism_app.database.user_info_model import UserInfoModel
from sqlalchemy import create_engine, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker
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
        self._engine = None
        self.active = False
        try:
            temp_eng = create_engine(DB_URI, connect_args={"connect_timeout": 3})
            with Session(bind=temp_eng) as session:
                session.execute(text("SELECT 1"))

            self._engine = create_engine(DB_URI)
            self._session_factory = sessionmaker(
                self._engine, class_=Session, expire_on_commit=False
            )
            self.active = True
            logger.info("Alerts DB connection is initialized.")
        except SQLAlchemyError as err:
            logger.error("Alerts DB connection failed: %s", err.__cause__)

    @property
    def engine(self):
        """SQLAlchemy engine (e.g. for admin UI or test setup)."""
        return self._engine

    def write(self, alert: AlertModel):
        """Write an alert to the alerts table."""
        with self._session_factory() as session:
            session.add(alert)
            session.commit()

    def readall(self) -> List[AlertModel]:
        """
        Get all the rows from this table.

        :return: A list of ORM object.
        """
        with self._session_factory() as session:
            return list(session.scalars(select(AlertModel)).all())

    def read(self, expr: ColumnElement[bool]) -> List[AlertModel]:
        """
        Return all the rows that match expression.

        :param expr: An expression that builds a filter.
        :return: A list of ORM object.
        """
        with self._session_factory() as session:
            return list(session.scalars(select(AlertModel).where(expr)).all())

    def readone(self, id: int):
        """
        Return one alert matching the provided id.

        :param id: The id of the wanted alert entity
        :return: An alert entity or None if no entity was found
        """
        with self._session_factory() as session:
            return session.scalars(
                select(AlertModel).where(AlertModel.id == id)
            ).first()

    def deactivate(self, alert: AlertModel) -> bool:
        """
        Deactivate an alert from the database.

        :param alert: An existing AlertModel element.
        :return: success boolean.
        """
        deactivation_successful = False
        try:
            with self._session_factory() as session:
                row = session.get(AlertModel, alert.id)
                if row is None:
                    return False
                row.active = False
                session.commit()
                deactivation_successful = True
        except Exception as e:
            logger.error("Failed to deactivate alert: %s", e)

        return deactivation_successful

    def delete(self, alert: AlertModel) -> bool:
        """
        Delete an alert from the database.

        :param alert: An existing AlertModel element.
        :return: success boolean.
        """
        delete_successful = False
        try:
            with self._session_factory() as session:
                row = session.get(AlertModel, alert.id)
                if row is not None:
                    session.delete(row)
                session.commit()
                delete_successful = True
        except Exception as e:
            logger.error("Failed to delete alert: %s", e)

        return delete_successful


class AuthDataBase:
    """
    Authentication Database.

    This object provides the methods that will be required to connect to
    database that stores the user info for access control.
    """

    def __init__(self):
        """Authentication Database initializer."""
        self._engine = None
        self.active = False
        try:
            temp_eng = create_engine(DB_URI, connect_args={"connect_timeout": 3})
            with Session(bind=temp_eng) as session:
                session.execute(text("SELECT 1"))

            self._engine = create_engine(DB_URI)
            self._session_factory = sessionmaker(
                self._engine, class_=Session, expire_on_commit=False
            )
            self.active = True
            logger.info("Auth DB connection is initialized.")
        except SQLAlchemyError as err:
            logger.error("Auth DB connection failed: %s", err.__cause__)

    @property
    def engine(self):
        return self._engine

    def create_user(self, user: UserInfoModel):
        """Create user with hashed password."""
        if user.salt != "false":
            salt = os.urandom(32)
            key = hashlib.pbkdf2_hmac(
                "sha256",
                user.password.encode("utf-8"),
                salt,
                100000,
            )
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
            with self._session_factory() as session:
                session.add(db_user)
                session.commit()
                session.refresh(db_user)
        except SQLAlchemyError as error:
            raise error

        return db_user

    def read(self, expr: ColumnElement[bool]) -> List[UserInfoModel]:
        """
        Return all the rows that match expression.

        :param expr: An expression that builds a filter.
        :return: A list of ORM object.
        """
        with self._session_factory() as session:
            return list(session.scalars(select(UserInfoModel).where(expr)).all())

    def get_by_username(self, username: str) -> Optional[UserInfoModel]:
        """
        Return one alert matching the provided id.

        :param username: The username of the wanted user entity
        :return: A user entity or None if no entity was found
        """
        try:
            with self._session_factory() as session:
                return session.scalars(
                    select(UserInfoModel).where(UserInfoModel.username == username)
                ).first()
        except SQLAlchemyError as error:
            logger.error("An error occured in get_by_username.", exc_info=True)
            logger.error(error)
            return None


# Local test
if __name__ == "__main__":
    alert_db = AlertsDataBase()
    for row in alert_db.read(AlertModel.alert_name.startswith("alert")):
        print(row.email)
