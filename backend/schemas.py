from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class HealthComponent(BaseModel):
    component: str
    status: Literal["ok", "degraded", "error"]
    detail: str | None = None


class HealthStatus(BaseModel):
    status: Literal["ok", "degraded", "error"]
    checks: list[HealthComponent]

class MessageBase(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str

class Message(MessageBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime

class ConversationBase(BaseModel):
    name: str

class Conversation(ConversationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    messages: list[Message] = Field(default_factory=list)

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversations: list[Conversation] = Field(default_factory=list)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GuestSession(Token):
    user_id: int


class ChatRequest(BaseModel):
    conversation_id: int | None = None
    message: str

    @field_validator("message")
    @classmethod
    def validate_message(cls, v):
        return _validate_text(v, "message")


class ChatResponse(BaseModel):
    conversation_id: int
    reply: str


class ChatStreamRequest(ChatRequest):
    request_id: str


def _validate_text(value: str, field_name: str) -> str:
    trimmed = value.strip()
    if not trimmed:
        raise ValueError(f"{field_name.capitalize()} cannot be empty")
    if len(trimmed) > 5000:
        raise ValueError(f"{field_name.capitalize()} is too long")
    return trimmed
