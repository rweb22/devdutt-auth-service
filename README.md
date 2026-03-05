# Devdutt - auth-service

Part of the **Devdutt Institute Virtual Sansad** platform - A digital parliament enabling structured discourse, evidence-based deliberation, and democratic decision-making.

## Description

Authentication & JWT token management

## Tech Stack

- **Runtime:** Node.js 20 LTS
- **Framework:** NestJS 11.0.16
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL 16 (with LTREE extension)
- **Cache:** Redis 7
- **Storage:** MinIO (S3-compatible)

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Run in development mode
npm run start:dev

# Run tests
npm test

# Build for production
npm run build
```

## API Documentation

API documentation is available at `http://localhost:3000/api` when running in development mode (Swagger).

## Project Structure

```
src/
├── modules/          # Feature modules
├── common/           # Shared utilities, guards, interceptors
├── config/           # Configuration files
└── main.ts           # Application entry point
```

## Environment Variables

See `.env.example` for required environment variables.

## Documentation

See [devdutt-docs](https://github.com/rweb22/devdutt-docs) for comprehensive documentation.

## Project Ecosystem

This repository is part of the Devdutt Institute microservices architecture. See the [Devdutt GitHub Project](https://github.com/users/rweb22/projects) for the complete ecosystem.

## License

MIT License - See LICENSE file for details.
