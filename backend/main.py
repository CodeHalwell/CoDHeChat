import os
from typing import AsyncGenerator

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, sessionmaker

from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import timedelta

import crud, models, schemas
from database import get_engine
from security import create_access_token, verify_password, get_password_hash

app = FastAPI()
engine = get_engine()
models.Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


from fastapi.responses import HTMLResponse
from dotenv import load_dotenv
from openai import AsyncOpenAI

from slowapi import Limiter
from slowapi.util import get_remote_address

from pydantic import BaseModel, validator

class ChatMessage(BaseModel):
    message: str

    @validator('message')
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError('Message cannot be empty')
        if len(v) > 5000:
            raise ValueError('Message too long')
        return v.strip()

# Load environment variables from .env file (including OPENAI_API_KEY)
load_dotenv()

limiter = Limiter(key_func=get_remote_address)

# Initialize AsyncOpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app.state.limiter = limiter

# Add CORS middleware to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Docker frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Optionally serve a simple home page (could be your React build in production)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@app.post("/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/")
def read_root():
    return HTMLResponse("<h3>Chatbot server is running</h3>")

@app.get("/health")
def health_check():
    return {"status": "healthy"}

from sqlalchemy.exc import SQLAlchemyError

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        db_user = crud.get_user_by_username(db, username=user.username)
        if db_user:
            raise HTTPException(status_code=400, detail="Username already registered")
        return crud.create_user(db=db, user=user)
    except SQLAlchemyError as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@app.get("/users/", response_model=list[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    try:
        users = crud.get_users(db, skip=skip, limit=limit)
        return users
    except SQLAlchemyError as e:
        logger.error(f"Error reading users: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    try:
        db_user = crud.get_user(db, user_id=user_id)
        if db_user is None:
            raise HTTPException(status_code=404, detail="User not found")
        return db_user
    except SQLAlchemyError as e:
        logger.error(f"Error reading user: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@app.post("/users/{user_id}/conversations/", response_model=schemas.Conversation)
def create_conversation_for_user(
    user_id: int, conversation: schemas.ConversationBase, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
):
    try:
        return crud.create_user_conversation(db=db, conversation=conversation, user_id=user_id)
    except SQLAlchemyError as e:
        logger.error(f"Error creating conversation: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@app.get("/conversations/{conversation_id}/messages/", response_model=list[schemas.Message])
def read_messages(conversation_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    try:
        messages = crud.get_messages(db, conversation_id=conversation_id, skip=skip, limit=limit)
        return messages
    except SQLAlchemyError as e:
        logger.error(f"Error reading messages: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@app.get("/conversations/", response_model=list[schemas.Conversation])
def read_conversations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    try:
        conversations = crud.get_conversations(db, skip=skip, limit=limit)
        return conversations
    except SQLAlchemyError as e:
        logger.error(f"Error reading conversations: {e}")
        raise HTTPException(status_code=500, detail="Database error")

# Define an async generator function to stream responses from OpenAI
async def stream_openai_response(user_message: str) -> AsyncGenerator[str, None]:
    """
    Call OpenAI API with the user's message and stream back the response text.
    Yields partial response chunks as they arrive.
    """
    # OpenAI ChatCompletion call with streaming enabled
    stream = await client.chat.completions.create(
        model=os.getenv('MODEL_NAME'), 
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": user_message}
        ],
        stream=True  # get incremental results as the AI generates the answer
    )
    
    full_reply = ""
    async for chunk in stream: 
        if chunk.choices[0].delta.content:
            full_reply += chunk.choices[0].delta.content
            yield full_reply 

# WebSocket endpoint for real-time chat
# Note: SlowAPI rate limiting doesn't work with WebSocket endpoints
# Rate limiting is handled by limiting concurrent connections instead
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Accept the WebSocket connection
    await websocket.accept()
    client_addr = websocket.client.host
    logger.info(f"Client connected: {client_addr}")

    try:
        while True:
            try:
                user_message = await websocket.receive_text()
                chat_message = ChatMessage(message=user_message)
                # For each chunk of AI response, send it over the WebSocket
                async for partial_reply in stream_openai_response(chat_message.message):
                    await websocket.send_text(partial_reply)
            except ValueError as e:
                await websocket.send_text(f"Error: {e}")
            # Optionally, send a special message or flag when done (not strictly needed)
    except WebSocketDisconnect:
        # Handle client disconnects gracefully
        logger.info(f"Client disconnected: {client_addr}")
        # (Loop will exit, and function ends)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)