import os
import pytest
from fastapi.testclient import TestClient
import sys

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

@pytest.fixture(scope="session")
def test_db():
    # Set the database URL for testing
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    yield
    # Unset the database URL after testing
    del os.environ["DATABASE_URL"]

@pytest.fixture(scope="session")
def client(test_db):
    from main import app
    from database import get_engine, Base
    
    engine = get_engine()
    
    # Create the tables in the test database
    Base.metadata.create_all(bind=engine)
    
    with TestClient(app) as c:
        yield c
        
    # Drop the tables after the tests
    Base.metadata.drop_all(bind=engine)
