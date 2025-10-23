from pydantic import BaseModel, ConfigDict
from datetime import datetime

class MessageBase(BaseModel):
    role: str
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
    messages: list[Message] = []

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversations: list[Conversation] = []
