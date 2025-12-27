# CoDHeChat - AI Chatbot Application

A modern, full-stack AI chatbot application featuring a React/TypeScript frontend with Material-UI and a Python FastAPI backend powered by OpenAI's GPT-3.5-turbo model. The application supports real-time streaming responses via WebSocket connections and includes conversation management with a sidebar for organizing multiple chat sessions.

![Project Status](https://img.shields.io/badge/status-production%20ready-green)
![Python](https://img.shields.io/badge/python-3.13+-blue)
![React](https://img.shields.io/badge/react-19.1.1-blue)
![TypeScript](https://img.shields.io/badge/typescript-5.9-blue)

## ✨ Features

### Chat Interface
- **Real-time Streaming**: Messages stream from the AI as they're generated for a natural conversation flow
- **WebSocket Communication**: Efficient real-time bidirectional communication between frontend and backend
- **Dark/Light Mode**: Toggle between dark and light themes with a single click
- **Responsive Design**: Clean, modern UI built with Material-UI components
- **Auto-scroll**: Automatically scrolls to the latest message in the conversation

### Conversation Management
- **Multiple Conversations**: Create and manage multiple chat sessions
- **Conversation Sidebar**: Easy navigation between different chat threads
- **Server Persistence**: Conversations and messages are stored in the FastAPI backend so you can resume any thread from any browser
- **Quick Access**: Click on any saved conversation to reload it from the server

### Technical Features
- **Type-Safe**: Full TypeScript implementation on the frontend
- **Error Handling**: Comprehensive error handling with user-friendly notifications
- **Reconnection Logic**: Automatic WebSocket reconnection with exponential backoff and per-request correlation IDs
- **Streaming Protocol**: WebSocket payloads are structured JSON chunks that include request IDs and conversation IDs, so concurrent prompts never leak tokens across sessions
- **Security First**: Guest sessions obtain signed JWTs from `/auth/guest`, every API/WebSocket call validates the token, and secrets/configuration are centrally managed through a typed Pydantic settings layer
- **Persistence Ready**: The backend defaults to SQLite for local development but can be pointed at PostgreSQL/MySQL by changing `DATABASE_URL`
- **CORS Enabled**: Backend configured to accept requests from frontend
- **Structured Logging & Health Checks**: JSON logs plus `/health` allow production observability and readiness probes out of the box

> 📘 **New to production systems?** Read [`docs/PRODUCTION_GUIDE.md`](docs/PRODUCTION_GUIDE.md) for a decision-by-decision explanation of how each feature works and why it exists.

## 🏗️ Architecture

The project consists of two main components:

```
CoDHeChat/
├── backend/              # Python FastAPI server
│   ├── main.py          # WebSocket server and OpenAI integration
│   ├── pyproject.toml   # Python dependencies (uv package manager)
│   └── .python-version  # Python version specification
│
└── my-chatbot/          # React TypeScript frontend
    ├── src/
    │   ├── components/  # React components
    │   │   ├── ChatContainer.tsx    # Main chat interface
    │   │   ├── MessageList.tsx      # Message display
    │   │   ├── Message.tsx          # Individual message
    │   │   └── MessageInput.tsx     # User input field
    │   ├── services/    # API communication layer
    │   │   └── chatService.ts       # WebSocket manager
    │   ├── types/       # TypeScript type definitions
    │   │   └── chat.ts
    │   ├── theme/       # Material-UI theme configuration
    │   │   └── theme.ts
    │   ├── hooks/       # Custom React hooks
    │   │   └── useChatScroll.ts
    │   ├── App.tsx      # Root component
    │   └── main.tsx     # Application entry point
    └── package.json
```

### Data Flow

1. **User Input** → User types message in `MessageInput` component
2. **State Update** → `ChatContainer` adds user message to state immediately
3. **WebSocket Send** → Message sent to backend via WebSocket connection
4. **OpenAI Processing** → Backend streams response from GPT-3.5-turbo
5. **Real-time Updates** → Frontend receives and displays partial responses as they arrive
6. **Completion** → Final message displayed and conversation auto-saved

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.13+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 18+** - [Download Node.js](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **uv** (Python package manager) - [Install uv](https://github.com/astral-sh/uv)
- **OpenAI API Key** - [Get API Key](https://platform.openai.com/api-keys)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/CodeHalwell/CoDHeChat.git
cd CoDHeChat
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies using uv
uv sync

# Create a .env file and add your OpenAI API key
echo "OPENAI_API_KEY=your_api_key_here" > .env
```

#### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd ../my-chatbot

# Install dependencies
npm install

# (Optional) Create .env file for custom API URL
echo "VITE_API_URL=http://localhost:8000" > .env
```

### Running the Application

You need to run both the backend and frontend servers simultaneously.

#### Terminal 1: Start the Backend

```bash
cd backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will start on `http://localhost:8000`

#### Terminal 2: Start the Frontend

```bash
cd my-chatbot
npm run dev
```

The frontend will start on `http://localhost:5173` (or another port if 5173 is occupied)

#### Access the Application

Open your browser and navigate to `http://localhost:5173`

## 🔧 Configuration

### Backend Configuration

Copy `backend/.env.example` to `backend/.env` and update the values:

```env
SECRET_KEY=replace-me
OPENAI_API_KEY=sk-...your-key-here...
DATABASE_URL=sqlite:///./chat.db
MODEL_NAME=gpt-4o-mini
LOG_LEVEL=INFO
LOG_JSON=true
```

- `SECRET_KEY` – required for signing JWT access tokens
- `OPENAI_API_KEY` – required for real responses (tests override the chat service so they run offline)
- `DATABASE_URL` – defaults to SQLite but accepts any SQLAlchemy connection string
- `MODEL_NAME` – OpenAI model to call when generating responses
- `LOG_LEVEL` – log verbosity (`DEBUG`, `INFO`, etc.)
- `LOG_JSON` – set to `false` locally for human-friendly plain text logs

### Frontend Configuration

Configure the frontend via `.env` file in the `my-chatbot` directory:

```env
# API endpoint (default: http://localhost:8000)
VITE_API_URL=http://localhost:8000
```

## 📝 Usage

1. **Start a Chat**: The frontend automatically provisions a short-lived guest token from `/auth/guest`, opens an authenticated WebSocket, and fetches your existing conversations
2. **Send Messages**: Type a prompt and press Enter or click Send; the UI optimistically renders your message while the backend persists it
3. **Watch Responses Stream**: Each WebSocket chunk updates the assistant message in place via a structured `{requestId, conversationId, content}` payload
4. **Create New Conversations**: Click "+ New Conversation" in the sidebar to clear the panel; the server assigns a real conversation ID as soon as the next message is processed
5. **Switch Between Chats**: Click on any conversation in the sidebar to retrieve its entire history from the backend
6. **Toggle Theme**: Click the sun/moon icon in the top-right corner (the chosen mode is persisted to localStorage)

## 🛠️ Development

### Backend Development

```bash
cd backend

# Run with auto-reload for development
uv run uvicorn main:app --reload

# Run tests (if available)
uv run pytest
```

### Frontend Development

```bash
cd my-chatbot

# Start development server
npm run dev

# Run linter
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Style

- **Backend**: Python code follows standard conventions, uses type hints
- **Frontend**: TypeScript with ESLint, React hooks patterns
- **Components**: Functional components with TypeScript interfaces

## 🔒 Security Considerations

⚠️ **Important Security Notes:**

1. **API Keys**: Never commit `.env` files or API keys to version control
2. **CORS**: The current configuration allows all origins (`allow_origins=["*"]`) - this is **only suitable for development**
3. **Production**: Before deploying to production:
   - Set specific allowed origins in CORS configuration
   - Add rate limiting to prevent API abuse
   - Implement authentication/authorization
   - Use HTTPS for all communications
   - Add input validation and sanitization
   - Consider implementing token usage limits

## 🐛 Troubleshooting

### Backend Issues

**Problem**: `ModuleNotFoundError: No module named 'fastapi'`
- **Solution**: Make sure you've run `uv sync` in the backend directory

**Problem**: `openai.AuthenticationError`
- **Solution**: Check that your `OPENAI_API_KEY` is correctly set in the `.env` file

**Problem**: `WebSocket connection failed`
- **Solution**: Ensure the backend server is running on port 8000

### Frontend Issues

**Problem**: `Failed to fetch` or connection errors
- **Solution**: Check that the backend is running and the `VITE_API_URL` is correct

**Problem**: `Module not found` errors
- **Solution**: Run `npm install` to ensure all dependencies are installed

**Problem**: WebSocket won't connect
- **Solution**: Check browser console for errors, ensure CORS is properly configured

## 📚 Technologies Used

### Backend
- **FastAPI**: Modern Python web framework for building APIs
- **OpenAI SDK**: Official Python SDK for OpenAI API
- **Uvicorn**: Lightning-fast ASGI server
- **python-dotenv**: Environment variable management
- **WebSockets**: Real-time bidirectional communication

### Frontend
- **React 19**: Latest React with modern hooks
- **TypeScript**: Type-safe JavaScript
- **Material-UI (MUI)**: Comprehensive React UI component library
- **Vite**: Next-generation frontend build tool
- **Emotion**: CSS-in-JS styling
- **Axios**: Promise-based HTTP client

## 🤝 Contributing

This is a learning project, but contributions and suggestions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available for educational purposes.

## 🙏 Acknowledgments

- OpenAI for providing the GPT API
- Material-UI team for the excellent component library
- FastAPI community for the amazing web framework
- The React and TypeScript communities

## 📧 Contact

Project Link: [https://github.com/CodeHalwell/CoDHeChat](https://github.com/CodeHalwell/CoDHeChat)

---

**Note**: This is a learning project created to explore full-stack development with modern web technologies. It demonstrates integrating AI capabilities into a web application with real-time communication.
