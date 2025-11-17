from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from settings import get_settings

ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def _get_secret_key() -> str:
    return get_settings().secret_key


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    settings = get_settings()
    to_encode = data.copy()
    expire_delta = expires_delta or timedelta(
        minutes=settings.access_token_expire_minutes
    )
    expire = datetime.now(timezone.utc) + expire_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, _get_secret_key(), algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, _get_secret_key(), algorithms=[ALGORITHM])


class InvalidTokenError(ValueError):
    """Raised when a JWT cannot be decoded."""

    def __init__(self, error: JWTError) -> None:
        super().__init__("Invalid authentication token")
        self.__cause__ = error
