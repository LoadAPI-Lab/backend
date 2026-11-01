# Infrastructure

Local stack: PostgreSQL, Redis, RabbitMQ, Core, worker, test server.

Run all commands from the repository root.

`apps/core/.env` must exist before starting the stack:

```bash
cp apps/core/.env.example apps/core/.env
```

```bash
cp infra/.env.example infra/.env   # optional: change ports and credentials

docker compose -f infra/docker-compose.yml up -d --build   # start
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

`MAX_CONCURRENT_TESTS` in `apps/core/.env` must equal the number of worker replicas.

| Service | URL |
|---|---|
| Core | API http://localhost:3001/v1, Swagger http://localhost:3001/docs |
| Test server | http://localhost:8080 (spec: `/openapi.yaml`) |
| RabbitMQ UI | http://localhost:15672 (`loadapi` / `loadapi`) |
| Redis | `localhost:6379` |
| PostgreSQL | `localhost:5432` (`loadapi` / `loadapi`) |