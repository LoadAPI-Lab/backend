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
