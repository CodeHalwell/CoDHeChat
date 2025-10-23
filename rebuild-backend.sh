#!/bin/bash

echo "=== Rebuilding Backend ==="
echo ""

echo "1. Stopping containers..."
sudo docker compose down

echo ""
echo "2. Rebuilding backend with --no-cache..."
sudo docker compose build --no-cache backend

echo ""
echo "3. Starting all services..."
sudo docker compose up -d

echo ""
echo "4. Waiting 15 seconds for services to start..."
sleep 15

echo ""
echo "5. Checking container status..."
sudo docker compose ps

echo ""
echo "6. Testing backend..."
curl -s http://localhost:8000/ || echo "Backend not responding yet"

echo ""
echo "7. Last 30 lines of backend logs:"
sudo docker compose logs --tail=30 backend

echo ""
echo "=== Done ==="
echo "If backend is running, it should be at http://localhost:8000"
echo "Frontend at http://localhost:3000"
