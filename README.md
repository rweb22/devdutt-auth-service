# Devdutt Auth Service

Authentication and user management service for the Devdutt parliamentary simulation platform.

## Description

This service handles:
- User registration and authentication
- JWT token generation and validation (RS256 algorithm)
- JWKS endpoint for public key distribution
- Password management (hashing, change, reset)
- Mobile number verification
- Account security (lockout, failed attempts tracking)
- User profile management

## Tech Stack

- **Runtime:** Node.js 20 LTS
- **Framework:** NestJS 11
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL 16
- **ORM:** TypeORM
- **Authentication:** Passport.js + JWT (RS256)
- **Password Hashing:** bcrypt
- **API Documentation:** Swagger/OpenAPI

## Prerequisites

- Node.js 20.x or higher
- PostgreSQL 16 running on port 5432
- Redis 7 running on port 6379 (optional, for future features)
- RSA key pair (generated automatically)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate RSA Keys

```bash
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE devdutt_auth;
CREATE USER devdutt WITH PASSWORD 'devdutt_dev';
GRANT ALL PRIVILEGES ON DATABASE devdutt_auth TO devdutt;
```

### 5. Run in Development Mode

```bash
npm run start:dev
```

The service will be available at:
- **API:** http://localhost:3001
- **Swagger Docs:** http://localhost:3001/api
- **JWKS Endpoint:** http://localhost:3001/.well-known/jwks.json

## API Endpoints

### Authentication

**Register**
```http
POST /auth/register
Content-Type: application/json

{
  "username": "citizen1",
  "mobileNumber": "9876543210",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "dateOfBirth": "1990-01-01",
  "sex": "MALE"
}
```

**Login**
```http
POST /auth/login
Content-Type: application/json

{
  "mobileNumber": "9876543210",
  "password": "SecurePass123!"
}
```

**Refresh Token**
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token-here"
}
```

**Logout**
```http
POST /auth/logout
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "refreshToken": "your-refresh-token-here"
}
```

### Profile Management

**Get Profile**
```http
GET /auth/profile
Authorization: Bearer <access-token>
```

**Update Profile**
```http
PUT /auth/profile
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "fullName": "John Updated Doe",
  "dateOfBirth": "1990-01-01",
  "sex": "MALE"
}
```

### Password Management

**Change Password**
```http
POST /auth/password/change
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

### Mobile Verification

**Send Verification Code**
```http
POST /auth/mobile/verify/send
Content-Type: application/json

{
  "mobileNumber": "9876543210",
  "purpose": "REGISTRATION"
}
```

**Verify Code**
```http
POST /auth/mobile/verify/confirm
Content-Type: application/json

{
  "mobileNumber": "9876543210",
  "code": "123456",
  "purpose": "REGISTRATION"
}
```

### JWKS

**Get Public Keys**
```http
GET /.well-known/jwks.json
```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `PORT` - Service port (default: 3001)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - Database configuration
- `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH` - RSA key paths
- `JWT_ACCESS_EXPIRES_IN` - Access token expiry in seconds (default: 3600)
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiry in seconds (default: 604800)
- `BCRYPT_ROUNDS` - Password hashing rounds (default: 10)
- `MAX_LOGIN_ATTEMPTS` - Max failed login attempts before lockout (default: 5)
- `ACCOUNT_LOCKOUT_DURATION` - Lockout duration in seconds (default: 900)

## Project Structure

```
src/
├── auth/
│   ├── controllers/
│   │   ├── auth.controller.ts      # Authentication endpoints
│   │   └── jwks.controller.ts      # JWKS endpoint
│   ├── services/
│   │   ├── auth.service.ts         # Authentication business logic
│   │   └── jwt.service.ts          # JWT token generation/validation
│   ├── strategies/
│   │   └── jwt.strategy.ts         # Passport JWT strategy
│   ├── guards/
│   │   ├── jwt-auth.guard.ts       # JWT authentication guard
│   │   └── roles.guard.ts          # Role-based authorization guard
│   ├── decorators/
│   │   ├── public.decorator.ts     # Public route decorator
│   │   └── roles.decorator.ts      # Roles decorator
│   └── auth.module.ts              # Auth module
├── common/
│   ├── services/
│   │   └── crypto.service.ts       # Password hashing, OTP generation
│   └── common.module.ts            # Common module
├── database/
│   └── database.module.ts          # Database configuration
├── entities/
│   ├── user.entity.ts              # User entity
│   ├── refresh-token.entity.ts     # Refresh token entity
│   └── verification-code.entity.ts # Verification code entity
├── app.module.ts                   # Root module
└── main.ts                         # Application entry point
```

## Security Features

- **Password Hashing:** bcrypt with configurable rounds (default: 10)
- **JWT Tokens:** RS256 algorithm with RSA key pair
- **Account Lockout:** Automatic lockout after failed login attempts
- **Token Expiry:** Separate expiry for access and refresh tokens
- **Mobile Verification:** OTP-based mobile number verification
- **CORS:** Configurable CORS for frontend integration
- **Rate Limiting:** Request throttling to prevent abuse

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Building for Production

```bash
# Build
npm run build

# Run production build
npm run start:prod
```

## Integration with Other Services

Other Devdutt services can validate JWT tokens by:

1. Fetching the public key from the JWKS endpoint:
   ```
   GET http://auth-service:3001/.well-known/jwks.json
   ```

2. Using the public key to verify JWT tokens (RS256 algorithm)

3. Extracting user information from the token payload:
   - `sub`: username
   - `role`: user role (PUBLIC, MP, STAFF, ADMIN)

## Troubleshooting

### RSA Keys Not Found
```bash
# Generate keys manually
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```

### Database Connection Failed
- Ensure PostgreSQL is running on port 5432
- Check database credentials in `.env`
- Verify database exists: `psql -U postgres -l`

### Port Already in Use
- Change `PORT` in `.env` to a different port
- Or kill the process using port 3001: `lsof -ti:3001 | xargs kill`

## License

MIT License - See LICENSE file for details.

---

**Migration Status:** ✅ Complete
**Migrated from:** Java/Spring Boot
**Migrated to:** NestJS + TypeScript
**Migration Date:** March 5, 2026
**Migrated by:** BMad Dev Agent #1

*Built with ❤️ using NestJS*
