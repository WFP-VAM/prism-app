from hashlib import sha256
from os import getenv

from fastapi import HTTPException
from starlette import status
from sqlalchemy import create_engine

from ..database import UserModel, UserZoneAccessModel

DB_URI = getenv(
    "DATABASE_URL"
) or "postgresql://{user}:{password}@{host}:{port}/{database}".format(
    host=getenv("POSTGRES_HOST", "localhost"),
    port=getenv("POSTGRES_PORT", "5432"),
    database=getenv("POSTGRES_DB", "postgres"),
    user=getenv("POSTGRES_USER", "postgres"),
    password=getenv("POSTGRES_PASSWORD", ""),
)


def check_auth(credentials, zones_url) -> None:
    username = credentials.username
    engine = create_engine(DB_URI)
    with engine.connect() as connection:
        user = UserModel.get_user_by_username(connection, username)
        is_correct_username = (username == user.username) if user else False
        if not is_correct_username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username",
                headers={"WWW-Authenticate": "Basic"},
            )
        is_correct_password = (
            get_password_hash(credentials.password) == user.hashed_password
        )
        if not is_correct_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password",
                headers={"WWW-Authenticate": "Basic"},
            )
        has_access = UserZoneAccessModel.has_access(connection, user.id, zones_url)
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This user doesn't have access to this zone",
                headers={"WWW-Authenticate": "Basic"},
            )
    return None


def get_password_hash(password: str):
    return sha256(password.encode("utf8")).hexdigest()
