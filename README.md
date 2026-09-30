# LoadAPI backend

All-in-One API Workspace: a tool for designing, testing, and load-testing WEB APIs.

Status: In Development

## Tech Stack

- Runtime: Node.js (pnpm)
- Framework: NestJS
- Database: PostgreSQL + Drizzle ORM
- Queue: RabbitMQ
- Cache / Pub-Sub: Redis
- Load Engine: Go

## Quick Start

### 1. Environment

Copy the example env file and fill in the variables:

```bash
cp .env.example .env
```

### 2. Run with Docker (recommended)

```bash
docker-compose up --build
```

### 3. Local run

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm start:dev
```

## API Documentation

Once running, the API docs are available at:

**http://localhost:3000/api/v1/docs**

## Structure

```
apps/
    core/ # NestJS control plane
    worker/ # Go load generator
```