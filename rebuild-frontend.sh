#!/bin/bash

echo "=== Rebuilding Frontend ==="
echo ""

echo "1. Building frontend locally..."
cd my-chatbot && npm run build

echo ""
echo "2. Stopping frontend container..."
cd ..
sudo docker compose stop frontend

echo ""
echo "3. Rebuilding frontend container..."
sudo docker compose build frontend

echo ""
echo "4. Starting frontend container..."
sudo docker compose up -d frontend

echo ""
echo "5. Checking status..."
sudo docker compose ps

echo ""
echo "=== Done ==="
echo "Frontend should be at http://localhost:3000"
