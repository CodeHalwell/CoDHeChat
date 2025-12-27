from uuid import uuid4

from sqlalchemy.orm import Session

import models
import schemas
from security import get_password_hash

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def create_guest_user(db: Session) -> models.User:
    username = f"guest-{uuid4().hex[:8]}"
    # Guest users do not have a usable password; use a sentinel value.
    hashed_password = get_password_hash("guest")
    user = models.User(username=username, hashed_password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_conversations(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Conversation)
        .filter(models.Conversation.user_id == user_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_conversation(db: Session, conversation_id: int, user_id: int):
    return (
        db.query(models.Conversation)
        .filter(
            models.Conversation.id == conversation_id,
            models.Conversation.user_id == user_id,
        )
        .first()
    )


def get_messages(
    db: Session, conversation_id: int, user_id: int, skip: int = 0, limit: int = 100
):
    return (
        db.query(models.Message)
        .join(models.Conversation)
        .filter(
            models.Message.conversation_id == conversation_id,
            models.Conversation.user_id == user_id,
        )
        .order_by(models.Message.id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_user_conversation(
    db: Session, conversation: schemas.ConversationBase, user_id: int
):
    db_conversation = models.Conversation(**conversation.model_dump(), user_id=user_id)
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    return db_conversation


def create_message(db: Session, conversation_id: int, role: str, content: str):
    db_message = models.Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


def list_conversation_history(db: Session, conversation_id: int, limit: int = 20):
    messages = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation_id)
        .order_by(models.Message.id.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(messages))
