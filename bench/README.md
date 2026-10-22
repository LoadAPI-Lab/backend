# Benchmarks

Run test jobs against the local stack and read the results.

Start the stack first: see [infra/README.md](../infra/README.md).

Run all commands from the repository root. Requires `python3`.

## Run a test

```bash
bench/scripts/publish-job.sh bench/jobs/scenario-demo.json
bench/scripts/publish-job.sh bench/jobs/single-fixed.json
bench/scripts/publish-job.sh bench/jobs/single-users.json
```

## Read results

```bash
bench/scripts/read-results.sh                                    # all events
bench/scripts/read-results.sh | tail -1 | python3 -m json.tool   # last result
bench/scripts/read-results.sh --consume                          # read and clear the queue
```

## Watch live snapshots

```bash
docker compose -f infra/docker-compose.yml exec redis redis-cli PSUBSCRIBE 'snapshot:*'
```

## Record CPU and memory

```bash
bench/scripts/record-stats.sh bench/results/run.csv   # Ctrl+C to stop
```