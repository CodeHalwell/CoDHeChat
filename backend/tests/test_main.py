import pytest
from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert "Chatbot server is running" in response.text


def test_health_check(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    component_names = {component["component"] for component in payload["checks"]}
    assert component_names == {"database", "chat_service"}


def test_chat_completion_creates_messages(client: TestClient):
    token = _create_user_and_token(client, suffix="chat")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/chat/completions",
        headers=headers,
        json={"message": "Hello there"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["reply"] == "Hello world!"
    conversation_id = data["conversation_id"]

    messages = client.get(
        f"/conversations/{conversation_id}/messages/",
        headers=headers,
    ).json()

    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"


def test_websocket_endpoint_streams_json(client: TestClient):
    token = _create_user_and_token(client, suffix="ws")
    with client.websocket_connect(f"/ws?token={token}") as websocket:
        payload = {
            "request_id": "req-123",
            "message": "Hello over ws",
            "conversation_id": None,
        }
        websocket.send_json(payload)

        first_chunk = websocket.receive_json()
        assert first_chunk["type"] == "chunk"
        assert first_chunk["content"] == "Hello"

        second_chunk = websocket.receive_json()
        assert second_chunk["type"] == "chunk"
        assert second_chunk["content"] == "Hello world!"
        assert second_chunk["conversationId"] == first_chunk["conversationId"]

        completion = websocket.receive_json()
        assert completion["type"] == "complete"
        assert completion["conversationId"] == first_chunk["conversationId"]


def _create_user_and_token(client: TestClient, suffix: str) -> str:
    username = f"tester-{suffix}"
    password = "secretpass"
    client.post("/users/", json={"username": username, "password": password})

    token_response = client.post(
        "/token",
        data={"username": username, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert token_response.status_code == 200
    return token_response.json()["access_token"]
