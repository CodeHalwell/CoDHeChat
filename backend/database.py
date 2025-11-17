from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from settings import get_settings


Base = declarative_base()


@lru_cache
def get_engine():
    settings = get_settings()
    return create_engine(
        settings.sqlalchemy_database_url,
        connect_args=settings.sqlalchemy_connect_args,
        pool_pre_ping=True,
    )


@lru_cache
def get_session_factory():
    return sessionmaker(autocommit=False, autoflush=False, bind=get_engine())


def get_db():
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()
