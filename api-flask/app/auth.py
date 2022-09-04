"""Utility function to authenticate users."""
import secrets

from app.database.database import AuthDataBase
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

security = HTTPBasic()
depends = Depends(security)

auth_db = None # AuthDataBase()

if auth_db is None:
    depends = lambda x: True


def validate_user(credentials: HTTPBasicCredentials = depends):
    """Validate user info."""
    if auth_db is None:
        return {"access": None}

    user_info = auth_db.get_by_username(username=credentials.username)
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Basic"},
        )

    is_correct_password = False
    if user_info.salt != "":
        is_correct_password = (
            security.verify_hash(credentials.password, user_info.salt).decode("utf-8")
            == user_info.password
        )
    # Temporary implementation without hashed passwords:
    else:
        current_password_bytes = credentials.password.encode("utf8")
        correct_password_bytes = user_info.password.encode("utf8")
        is_correct_password = secrets.compare_digest(
            current_password_bytes, correct_password_bytes
        )
    if not is_correct_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return user_info
