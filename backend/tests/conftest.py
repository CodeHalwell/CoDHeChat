import os
import pathlib
import sys
from typing import Generator

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

TEST_DB_PATH = pathlib.Path(__file__).resolve().parent.parent / "test.db"


class FakeChatService:
    async def stream_reply(self, history):  # pragma: no cover - trivial
        for chunk in ["Hello", " world!"]:
            yield chunk

    async def generate_reply(self, history):
        return "Hello world!"


@pytest.fixture(scope="session", autouse=True)
def configure_env() -> Generator[None, None, None]:
    os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
    os.environ["SECRET_KEY"] = "test-secret"
    yield
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


@pytest.fixture(scope="session")
def client(configure_env):
    from main import app, get_chat_service_dependency
    from database import Base, get_engine

    engine = get_engine()
    Base.metadata.create_all(bind=engine)

    fake_service = FakeChatService()
    app.dependency_overrides[get_chat_service_dependency] = lambda: fake_service

    with TestClient(app) as c:
        app.state.chat_service = fake_service
        yield c

    app.dependency_overrides.pop(get_chat_service_dependency, None)
    app.state.chat_service = None
    Base.metadata.drop_all(bind=engine)
