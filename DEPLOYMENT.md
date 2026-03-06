# 🚀 Deployment Guide - devdutt-auth-service

## Quick Start - Local Docker Deployment

### Prerequisites
- Docker and Docker Compose installed
- RSA keys generated (see below)
- `.env` file configured

### Step 1: Generate RSA Keys (if not already done)

```bash
cd ~/workspace/Devdutt/devdutt-auth-service
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
chmod 600 keys/private.pem
chmod 644 keys/public.pem
```

### Step 2: Verify Environment Configuration

Check that `.env` file exists and has correct values:

```bash
cat .env
```

Key variables:
- `PORT=3001`
- `DB_NAME=devdutt_auth`
- `JWT_PRIVATE_KEY_PATH=./keys/private.pem`
- `JWT_PUBLIC_KEY_PATH=./keys/public.pem`

### Step 3: Build and Start Services

```bash
# Build and start all services (auth-service, postgres, redis)
docker-compose up -d

# Check logs
docker-compose logs -f auth-service

# Check service health
curl http://localhost:3001/health
```

### Step 4: Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Test health endpoint
curl http://localhost:3001/health

# Test JWKS endpoint
curl http://localhost:3001/.well-known/jwks.json

# Access Swagger documentation
open http://localhost:3001/api
```

### Step 5: Test Registration and Login

```bash
# Register a new user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "mobileNumber": "9876543210",
    "password": "SecurePass123!",
    "fullName": "Test User",
    "dateOfBirth": "1990-01-01",
    "sex": "MALE"
  }'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "mobileNumber": "9876543210",
    "password": "SecurePass123!"
  }'
```

## Management Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Just auth-service
docker-compose logs -f auth-service

# Just postgres
docker-compose logs -f postgres
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes database)
docker-compose down -v
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart just auth-service
docker-compose restart auth-service
```

### Database Access
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U devdutt -d devdutt_auth

# Run SQL queries
docker-compose exec postgres psql -U devdutt -d devdutt_auth -c "SELECT * FROM users;"
```

### Rebuild After Code Changes
```bash
# Rebuild and restart
docker-compose up -d --build

# Or rebuild specific service
docker-compose up -d --build auth-service
```

## Troubleshooting

### Service won't start
```bash
# Check logs
docker-compose logs auth-service

# Check if port 3001 is already in use
lsof -i :3001

# Check if postgres is ready
docker-compose exec postgres pg_isready -U devdutt
```

### Database connection issues
```bash
# Verify postgres is running
docker-compose ps postgres

# Check postgres logs
docker-compose logs postgres

# Verify database exists
docker-compose exec postgres psql -U devdutt -l
```

### Reset everything
```bash
# Stop and remove everything
docker-compose down -v

# Remove images
docker-compose down --rmi all -v

# Start fresh
docker-compose up -d
```

## Production Deployment

For production deployment, see separate production guide.

Key differences:
- Use production Dockerfile (not Dockerfile.dev)
- Set `NODE_ENV=production`
- Use strong passwords and secrets
- Enable HTTPS/TLS
- Set up proper logging and monitoring
- Configure backup for PostgreSQL
- Use managed database service (recommended)

