# Production Guide & Design Rationale

This document explains **why** every major feature in CoDHeChat exists and how it contributes to shipping a production-grade chatbot. Use it as a learning journal when exploring the repository.

## 1. Architecture Overview

| Layer | Key Modules | Rationale |
| --- | --- | --- |
| FastAPI backend | `backend/main.py`, `crud.py`, `models.py`, `schemas.py`, `services/chat_service.py` | Provides authenticated REST/WebSocket APIs, persistence, and an OpenAI integration. Splitting concerns keeps IO, business logic, and transport layers testable. |
| React frontend | `my-chatbot/src/components`, `services`, `types` | Implements the UX, state management, and secure communication with the backend via REST/WebSocket clients. Modular components make accessibility and theming improvements straightforward. |
| Shared tooling | `docker-compose.yml`, `.env` files, scripts | Defines reproducible dev/prod workflows so every environment matches CI/CD expectations. |

## 2. Configuration & Secrets

* **Typed settings (`backend/settings.py`)** – Pydantic validates environment variables (database URL, OpenAI keys, log level) before the app starts, so configuration bugs fail fast instead of during runtime.
* **`.env.example`** – Documents every required variable, including logging toggles. Teams can copy it to `.env` for local dev or map it to secrets managers in production.
* **Guest authentication (`/auth/guest`)** – Offers a secure default auth flow that still works during demos. Guest tokens are short-lived JWTs signed with `SECRET_KEY`.

## 3. Reliability & Observability

* **Structured logging (`backend/logging_config.py`)** – `configure_logging` emits JSON logs by default, making it trivial to ship telemetry to Loki, Datadog, or CloudWatch. Toggle plaintext logs locally via `LOG_JSON=false`.
* **Rate limiting (SlowAPI)** – Every login/chat endpoint includes per-IP limits that prevent abuse and provide predictable load envelopes.
* **Connection limiter** – Guards WebSocket fan-out so a single noisy user cannot exhaust server resources.
* **Health endpoint (`GET /health`)** – Confirms the database and chat service are reachable. The aggregated status drives Kubernetes readiness checks and deployment automation.
* **Database migrations (SQLAlchemy models + Alembic scaffolding)** – `models.py` defines normalized tables while Alembic handles schema evolution.

## 4. Data Persistence & Domain Model

* **Users / Conversations / Messages** – `models.py` & `crud.py` persist the entire conversation tree. Every API call reuses the CRUD helpers, which centralize validation and transaction handling.
* **History-aware prompts** – Before calling OpenAI, `main.py` pulls the full history via `crud.list_conversation_history` so assistants answer with context.
* **Tests with SQLite** – `backend/tests/conftest.py` swaps in a temporary SQLite file. This mimics production flows without needing Postgres in CI.

## 5. Security Posture

* **JWT authentication** – `security.py` issues and validates signed tokens for REST and WebSocket calls. Middleware rejects missing tokens early, reducing attack surface.
* **Password hashing** – `passlib[bcrypt]` handles hashing/salting so plaintext credentials never touch the DB.
* **CORS whitelist** – `settings.allowed_origins` enumerates approved origins and can be extended via env vars during deployment.
* **Input validation** – `schemas.py` trims/limits user messages (max 5,000 chars) preventing prompt injection payloads from overwhelming the model.

## 6. Frontend Decisions

| Feature | Files | Explanation |
| --- | --- | --- |
| Guest bootstrap | `src/services/sessionService.ts` | Automatically requests a guest JWT and stores it securely, so every API call carries credentials. |
| API abstraction | `httpClient.ts`, `chatService.ts`, `conversationService.ts` | Centralizes fetch/WebSocket logic with retries and structured errors. Keeps React components declarative. |
| Conversation sync | `ChatContainer.tsx` | UI state mirrors the backend via REST calls; local caches act as optimistic updates while awaiting server confirmation. |
| Sanitized rendering | `Message.tsx` | Markdown + syntax highlighting pass through sanitizers before hitting `dangerouslySetInnerHTML`, blocking XSS vectors. |
| Theme persistence | `App.tsx` | Uses `localStorage` to remember the user’s last-selected theme, removing UI flicker on reload. |

## 7. Testing Strategy

* **Backend** – `backend/tests/test_main.py` uses FastAPI’s `TestClient` plus a fake chat service to exercise REST and WebSocket flows (auth, message persistence, streaming protocol, health checks).
* **Frontend** – `npm run test` executes component-level tests (e.g., message formatting) via Vitest. Extend this suite before touching UX-critical flows.
* **Command contract** – CI should run `uv run pytest` and `npm run test`. These commands constitute the acceptance criteria for every change.

## 8. Deployment Playbook

1. Copy `.env.example` to `.env` and populate secrets using your secret manager.
2. Run database migrations (Alembic) if schemas changed.
3. Build containers with the provided Dockerfiles or compose file.
4. Configure liveness probes: `GET /health` for readiness, `GET /` for liveness.
5. Point the frontend `VITE_API_URL` at the deployed backend URL.
6. Monitor logs/metrics; alerts should trigger if health checks flip to `degraded`/`error`.

## 9. Extending the System

* Add analytics by tapping into structured logs or emitting OpenTelemetry traces.
* Replace the guest auth flow with OAuth2 for enterprise contexts while keeping the same token guards.
* Scale horizontally by fronting the backend with a load balancer; connection limits + rate limiting already make each node well-behaved.

Refer back to this guide whenever you explore or extend the repo—the “why” behind each module is as important as the “what.”
