import pytest
from fastapi.testclient import TestClient
from main import app
import asyncio

def test_root_endpoint(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert "Chatbot server is running" in response.text

def test_health_check(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

@pytest.mark.anyio
async def test_websocket_endpoint(client: TestClient):
    with client.websocket_connect("/ws") as websocket:
        # Test connection
        assert websocket.scope["type"] == "websocket"
        
        # Test sending a message and receiving a response
        test_message = "Hello, WebSocket!"
        websocket.send_text(test_message)
        
        # Allow some time for the server to process the message
        await asyncio.sleep(1)
        
        response = websocket.receive_text()
        assert isinstance(response, str)
