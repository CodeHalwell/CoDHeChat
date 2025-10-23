from sqlalchemy.orm import Session
import models, schemas
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

def get_conversations(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Conversation).offset(skip).limit(limit).all()

def get_messages(db: Session, conversation_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Message).filter(models.Message.conversation_id == conversation_id).offset(skip).limit(limit).all()

def create_user_conversation(db: Session, conversation: schemas.ConversationBase, user_id: int):
    db_conversation = models.Conversation(**conversation.dict(), user_id=user_id)
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    return db_conversation
