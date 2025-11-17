# CoDHeChat Frontend

This Vite + React + TypeScript application provides the real-time chat interface for the FastAPI backend. It manages guest sessions, maintains authenticated WebSocket connections, renders streaming assistant responses, and synchronizes conversations with the API.

## Available scripts

All commands are run from the `my-chatbot/` directory:

```bash
npm install        # install dependencies
npm run dev        # start Vite dev server on http://localhost:5173
npm run build      # production build
npm run test       # run Vitest unit tests
npm run lint       # run ESLint with the repo defaults
```

## Environment variables

Create a `.env` file (or use the defaults):

```
VITE_API_URL=http://localhost:8000
```

The value must match the backend URL so that the frontend can request guest tokens, fetch conversations, and open authenticated WebSocket connections.

## Architecture notes

- `src/services/sessionService.ts` provisions short-lived guest JWTs by calling the backend `/auth/guest` endpoint and stores them in `localStorage`.
- `src/services/chatService.ts` maintains a singleton WebSocket connection, correlates server chunks by `requestId`, and updates pending resolver callbacks.
- `src/services/conversationService.ts` exposes simple helpers for listing conversations and retrieving message history from the REST API.
- `src/components/Message.tsx` renders Markdown/Code blocks via `react-markdown`, `rehype-sanitize`, and `highlight.js` so that user provided content is sanitized before hitting the DOM.
- Theme preferences are persisted across sessions, and all conversation data is sourced from the backend instead of local storage so multiple devices stay in sync.
