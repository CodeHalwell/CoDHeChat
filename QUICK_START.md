# Quick Start Guide

## Starting the Application

```bash
# Easy way - use the start script
./start.sh

# Manual way
sudo docker compose down
sudo docker compose build
sudo docker compose up -d
```

## Checking Status

```bash
# Run diagnostics
./diagnose.sh

# View logs
sudo docker compose logs -f

# Check specific service
sudo docker compose logs -f backend
sudo docker compose logs -f frontend
```

## Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Database**: localhost:5432 (postgres/postgres)

## Troubleshooting

### Backend won't start
```bash
# Check backend logs
sudo docker compose logs backend

# Common issues:
# 1. Missing OPENAI_API_KEY in .env
# 2. Database not ready - wait 10 seconds and check again
# 3. Port 8000 already in use
```

### WebSocket connection fails
```bash
# 1. Verify backend is running
curl http://localhost:8000/

# 2. Check backend logs for errors
sudo docker compose logs -f backend

# 3. Verify CORS settings in backend/main.py allow port 3000
```

### Frontend won't build
```bash
# Check for TypeScript errors
cd my-chatbot
npm run build

# If errors, check ChatContainer.tsx for unused imports/variables
```

## Environment Variables

Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=sk-...
MODEL_NAME=gpt-4o
```

## Rebuilding After Code Changes

```bash
# Rebuild everything
sudo docker compose build --no-cache

# Rebuild specific service
sudo docker compose build --no-cache backend

# Restart services
sudo docker compose up -d
```

## Stopping the Application

```bash
sudo docker compose down

# Remove volumes (database data)
sudo docker compose down -v
```
