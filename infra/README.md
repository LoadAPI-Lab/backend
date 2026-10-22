# Infrastructure

Local stack: PostgreSQL, Redis, RabbitMQ, worker, test server.

Run all commands from the repository root.

```bash
cp infra/.env.example infra/.env   # optional: change ports and credentials

docker compose -f infra/docker-compose.yml up -d --build   # start
docker compose -f infra/docker-compose.yml ps              # status
docker compose -f infra/docker-compose.yml logs -f worker  # logs
docker compose -f infra/docker-compose.yml down            # stop
docker compose -f infra/docker-compose.yml down -v         # stop and delete data
```

Multiple workers:

```bash
docker compose -f infra/docker-compose.yml up -d --build --scale worker=3
```

| Service | URL |
|---|---|
| Test server | http://localhost:8080 (spec: `/openapi.yaml`) |
| RabbitMQ UI | http://localhost:15672 (`loadapi` / `loadapi`) |
| Redis | `localhost:6379` |
| PostgreSQL | `localhost:5432` (`loadapi` / `loadapi`) |