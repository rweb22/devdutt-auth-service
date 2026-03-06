#!/bin/bash

# Local Deployment Script for devdutt-auth-service
# This script sets up and deploys the auth service locally with Docker

set -e  # Exit on error

echo "🚀 Devdutt Auth Service - Local Deployment"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    echo "Please start Docker and try again"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if RSA keys exist
if [ ! -f "keys/private.pem" ] || [ ! -f "keys/public.pem" ]; then
    echo -e "${YELLOW}⚠️  RSA keys not found. Generating...${NC}"
    mkdir -p keys
    openssl genrsa -out keys/private.pem 2048 2>/dev/null
    openssl rsa -in keys/private.pem -pubout -out keys/public.pem 2>/dev/null
    chmod 600 keys/private.pem
    chmod 644 keys/public.pem
    echo -e "${GREEN}✅ RSA keys generated${NC}"
else
    echo -e "${GREEN}✅ RSA keys found${NC}"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Copying from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env file with your configuration${NC}"
    echo -e "${YELLOW}⚠️  Press Enter to continue or Ctrl+C to exit and edit .env${NC}"
    read
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

# Stop existing containers
echo ""
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build and start services
echo ""
echo "🏗️  Building and starting services..."
docker-compose up -d --build

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check health
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Auth service is healthy!${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting for auth service... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Auth service failed to start${NC}"
    echo "Check logs with: docker-compose logs auth-service"
    exit 1
fi

# Display service information
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Deployment Successful!${NC}"
echo "=========================================="
echo ""
echo "📍 Service URLs:"
echo "   - API:         http://localhost:3001"
echo "   - Health:      http://localhost:3001/health"
echo "   - Swagger:     http://localhost:3001/api"
echo "   - JWKS:        http://localhost:3001/.well-known/jwks.json"
echo ""
echo "🗄️  Database:"
echo "   - PostgreSQL:  localhost:5432"
echo "   - Database:    devdutt_auth"
echo "   - User:        devdutt"
echo ""
echo "📊 Management Commands:"
echo "   - View logs:   docker-compose logs -f"
echo "   - Stop:        docker-compose down"
echo "   - Restart:     docker-compose restart"
echo ""
echo "🧪 Test the service:"
echo "   curl http://localhost:3001/health"
echo ""

