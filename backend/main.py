from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

import crud
import models
import schemas
from database import Base, get_db, get_engine, get_session_factory
from schemas import ChatResponse
from security import create_access_token, decode_access_token, verify_password
from services.chat_service import ChatService, build_chat_service
from settings import get_settings
from logging_config import configure_logging
from sqlalchemy import text

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


class ConnectionLimiter:
    def __init__(self, max_connections: int) -> None:
        self.max_connections = max_connections
        self._active = 0
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            if self._active >= self.max_connections:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many active WebSocket connections",
                )
            self._active += 1

    async def release(self) -> None:
        async with self._lock:
            self._active = max(0, self._active - 1)


connection_limiter = ConnectionLimiter(get_settings().max_websocket_connections)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()
    configure_logging(settings)
    engine = get_engine()
    Base.metadata.create_all(bind=engine)

    app.state.settings = settings
    try:
        app.state.chat_service = build_chat_service(settings)
        logger.info("Chat service initialised with model %s", settings.openai_model)
    except RuntimeError as exc:
        app.state.chat_service = None
        logger.warning("Chat service disabled: %s", exc)

    yield


app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def get_chat_service_dependency(request: Request) -> ChatService:
    chat_service: ChatService | None = getattr(request.app.state, "chat_service", None)
    if not chat_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat service is unavailable",
        )
    return chat_service


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
):
    try:
        payload = decode_access_token(token)
        username = payload.get("sub")
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )

    user = crud.get_user_by_username(db, username=username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


@limiter.limit("30/minute")
@app.post("/token", response_model=schemas.Token)
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return schemas.Token(access_token=access_token)


@limiter.limit("5/minute")
@app.post("/auth/guest", response_model=schemas.GuestSession)
def create_guest_session(request: Request, db: Session = Depends(get_db)):
    user = crud.create_guest_user(db)
    token = create_access_token(data={"sub": user.username})
    return schemas.GuestSession(access_token=token, user_id=user.id)


@limiter.limit("20/minute")
@app.post("/users/", response_model=schemas.User)
def create_user(
    request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)
):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.create_user(db=db, user=user)


@app.get("/users/", response_model=list[schemas.User])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return crud.get_users(db, skip=skip, limit=limit)


@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@app.post(
    "/users/{user_id}/conversations/",
    response_model=schemas.Conversation,
)
def create_conversation_for_user(
    user_id: int,
    conversation: schemas.ConversationBase,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot create conversation")
    return crud.create_user_conversation(db=db, conversation=conversation, user_id=user_id)


@app.get("/conversations/", response_model=list[schemas.Conversation])
def read_conversations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return crud.get_conversations(db, user_id=current_user.id, skip=skip, limit=limit)


@app.get(
    "/conversations/{conversation_id}/messages/",
    response_model=list[schemas.Message],
)
def read_messages(
    conversation_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return crud.get_messages(
        db,
        conversation_id=conversation_id,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
    )


@limiter.limit("30/minute")
@app.post("/chat/completions", response_model=ChatResponse)
async def chat_completion(
    request: Request,
    chat_request: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service_dependency),
):
    conversation = _ensure_conversation(db, current_user.id, chat_request)
    user_message = crud.create_message(
        db,
        conversation_id=conversation.id,
        role="user",
        content=chat_request.message,
    )

    history_records = crud.list_conversation_history(db, conversation.id)
    history_payload = [
        {"role": record.role, "content": record.content}
        for record in history_records
    ]

    assistant_reply = await chat_service.generate_reply(history_payload)
    crud.create_message(
        db, conversation_id=conversation.id, role="assistant", content=assistant_reply
    )

    return ChatResponse(conversation_id=conversation.id, reply=assistant_reply)


@app.get("/")
def read_root():
    return HTMLResponse("<h3>Chatbot server is running</h3>")


@app.get("/health", response_model=schemas.HealthStatus)
def health_check(request: Request, db: Session = Depends(get_db)):
    checks: list[schemas.HealthComponent] = []

    try:
        db.execute(text("SELECT 1"))
        checks.append(schemas.HealthComponent(component="database", status="ok"))
    except Exception as exc:  # noqa: BLE001
        logger.exception("Database health check failed")
        checks.append(
            schemas.HealthComponent(
                component="database",
                status="error",
                detail=str(exc),
            )
        )

    chat_service = getattr(request.app.state, "chat_service", None)
    if chat_service:
        checks.append(
            schemas.HealthComponent(component="chat_service", status="ok")
        )
    else:
        checks.append(
            schemas.HealthComponent(
                component="chat_service",
                status="degraded",
                detail="chat service disabled",
            )
        )

    overall_status = "ok"
    if any(check.status == "error" for check in checks):
        overall_status = "error"
    elif any(check.status == "degraded" for check in checks):
        overall_status = "degraded"

    return schemas.HealthStatus(status=overall_status, checks=checks)


def _ensure_conversation(
    db: Session, user_id: int, chat_request: schemas.ChatRequest
):
    if chat_request.conversation_id:
        conversation = crud.get_conversation(
            db, conversation_id=chat_request.conversation_id, user_id=user_id
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation

    title = chat_request.message[:60] or "Conversation"
    return crud.create_user_conversation(
        db,
        conversation=schemas.ConversationBase(name=title),
        user_id=user_id,
    )


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await connection_limiter.acquire()
    await websocket.accept()

    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Missing token")
        await connection_limiter.release()
        return

    session_factory = get_session_factory()
    db = session_factory()

    try:
        payload = decode_access_token(token)
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = crud.get_user_by_username(db, username=username)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
    except JWTError:
        await websocket.close(code=1008, reason="Invalid token")
        db.close()
        await connection_limiter.release()
        return

    chat_service: ChatService | None = getattr(websocket.app.state, "chat_service", None)
    if not chat_service:
        await websocket.close(code=1013, reason="Chat service unavailable")
        db.close()
        await connection_limiter.release()
        return

    try:
        while True:
            raw_payload = await websocket.receive_json()
            try:
                request_model = schemas.ChatStreamRequest.model_validate(raw_payload)
            except Exception as exc:  # noqa: BLE001
                await websocket.send_json(
                    {
                        "type": "error",
                        "detail": "Invalid payload",
                        "errors": str(exc),
                    }
                )
                continue

            conversation = _ensure_conversation(db, user.id, request_model)
            crud.create_message(
                db,
                conversation_id=conversation.id,
                role="user",
                content=request_model.message,
            )

            history_records = crud.list_conversation_history(db, conversation.id)
            history_payload = [
                {"role": record.role, "content": record.content}
                for record in history_records
            ]

            reply_accumulator = ""
            try:
                async for chunk in chat_service.stream_reply(history_payload):
                    reply_accumulator += chunk
                    await websocket.send_json(
                        {
                            "type": "chunk",
                            "requestId": request_model.request_id,
                            "conversationId": conversation.id,
                            "content": reply_accumulator,
                        }
                    )
            except Exception as exc:  # noqa: BLE001
                logger.exception("Error while streaming response: %s", exc)
                await websocket.send_json(
                    {
                        "type": "error",
                        "requestId": request_model.request_id,
                        "detail": "Failed to generate response",
                    }
                )
                continue

            crud.create_message(
                db,
                conversation_id=conversation.id,
                role="assistant",
                content=reply_accumulator,
            )
            await websocket.send_json(
                {
                    "type": "complete",
                    "requestId": request_model.request_id,
                    "conversationId": conversation.id,
                }
            )
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: %s", websocket.client)
    finally:
        db.close()
        await connection_limiter.release()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
