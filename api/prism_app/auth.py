"""Utility function to authenticate users."""

import base64
import hashlib
import logging
import secrets
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from prism_app.database.database import AuthDataBase
from prism_app.database.user_info_model import UserInfoModel
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)

security = HTTPBasic()
auth_db = AuthDataBase()

# When auth_db is not active (local dev), make credentials optional
if not auth_db.active:
    depends = Depends(lambda: None)
else:
    depends = Depends(security)


def verify_hash(password: str, saved_salt: str) -> bytes:
    """Verify password hash."""
    # Salt is a utf-8 string so we encode it in Base64 and then decode the Base64 to bytes
    saved_salt_bytes: bytes = saved_salt.encode("utf-8")
    saved_salt_bytes = base64.b64decode(saved_salt_bytes)
    key = hashlib.pbkdf2_hmac(
        "sha256",  # The hash digest algorithm for HMAC
        password.encode("utf-8"),  # Convert the password to bytes
        saved_salt_bytes,  # Provide the salt
        100000,  # It is recommended to use at least 100,000 iterations of SHA-256
    )
    key = base64.b64encode(key)
    return key


def validate_user(
    credentials: Annotated[Optional[HTTPBasicCredentials], depends] = None,
) -> UserInfoModel:
    """Validate user info."""
    if not auth_db.active:
        return UserInfoModel(access={})
    
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Basic"},
        )

    try:
        user_info = auth_db.get_by_username(username=credentials.username)
    except SQLAlchemyError as error:
        logger.error(error)
        raise HTTPException(
            status_code=500, detail="An internal error occurred."
        ) from error

    user_password, user_salt = "", ""
    if user_info is not None:
        user_password = user_info.password
        user_salt = user_info.salt

    is_correct_password: bool = False
    # Temporarily bypass hash passwords using salt=false
    if user_salt != "" and user_salt.lower() != "false":
        is_correct_password = (
            verify_hash(credentials.password, user_salt or "false").decode("utf-8")
            == user_password
        )

    # Temporary implementation without hashed passwords
    else:
        current_password_bytes = credentials.password.encode("utf8")
        correct_password_bytes = user_password.encode("utf8")
        is_correct_password = secrets.compare_digest(
            current_password_bytes, correct_password_bytes
        )

    if not is_correct_password or user_info is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return user_info
