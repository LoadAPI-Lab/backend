# Infrastructure

Local stack: PostgreSQL, Redis, RabbitMQ, Core, worker, test server.

Run all commands from the repository root.

`infra/.env` is the only file the Docker stack reads. The apps' own `.env` files are only for running outside Docker.

Put the provided `.env` at `infra/.env`, or create it from the example, then start the stack:

```bash
cp infra/.env.example infra/.env
docker compose -f infra/docker-compose.yml up -d
```

```bash
docker compose -f infra/docker-compose.yml up -d --build   # rebuild from source and start
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up -d --build core   # core in dev mode with watch
docker compose -f infra/docker-compose.yml ps              # status
docker compose -f infra/docker-compose.yml logs -f worker  # logs
docker compose -f infra/docker-compose.yml down            # stop
docker compose -f infra/docker-compose.yml down -v         # stop and delete data
```

Multiple workers:

```bash
docker compose -f infra/docker-compose.yml up -d --build --scale worker=3
```

`MAX_CONCURRENT_TESTS` in `infra/.env` must equal the number of worker replicas.

| Service | URL |
|---|---|
| Core | API http://localhost:3001/v1, Swagger http://localhost:3001/docs |
| Test server | http://localhost:8080 (spec: `/openapi.yaml`) |
| RabbitMQ UI | http://localhost:15672 (`loadapi` / `loadapi`) |
| Redis | `localhost:6379` |
| PostgreSQL | `localhost:5432` (`loadapi` / `loadapi`) |

## Run with published images

```bash
cp infra/.env.example infra/.env
docker login ghcr.io
docker compose -f infra/docker-compose.yml pull core worker testserver
docker compose -f infra/docker-compose.yml up -d
```

`docker login` is only needed if the packages are private. `IMAGE_TAG` selects the image tag (default `dev`).

## OAuth sign-in

Users sign in with GitHub or Google. Core starts without OAuth keys; `GET /v1/oauth/providers` lists only the providers whose client id and secret are set.

GitHub OAuth App (GitHub → Settings → Developer settings → OAuth Apps → New OAuth App):

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3001/v1/oauth/github/callback`
- After registering, generate a client secret.

Google OAuth client (Google Cloud Console → APIs & Services):

- Configure the OAuth consent screen (External, add your account as a test user).
- Credentials → Create credentials → OAuth client ID → Web application.
- Authorized redirect URI: `http://localhost:3001/v1/oauth/google/callback`

Fill in `infra/.env` and restart Core:

```bash
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

```bash
docker compose -f infra/docker-compose.yml up -d core
```

After sign-in Core sets httpOnly cookies and redirects to `FRONTEND_URL/oauth/callback` (with `?error=<code>` on failure). `CORS_ALLOWED_ORIGINS` must contain the frontend origin: non-GET requests from other origins are rejected. On a deployed API set `API_PUBLIC_URL`; the callback URLs are built from it and must be registered with that host.
