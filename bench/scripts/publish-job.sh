#!/usr/bin/env bash
# Publishes a job file to the test_jobs queue through the RabbitMQ management API.
# The testId is replaced with <file name>-<unix time>, so every run is a new test.
# Usage: bench/scripts/publish-job.sh bench/jobs/single-fixed.json
set -euo pipefail

job=${1:?usage: publish-job.sh JOB.json}
api=${RABBITMQ_API:-http://localhost:15672/api}
user=${RABBITMQ_USER:-loadapi}
password=${RABBITMQ_PASSWORD:-loadapi}

body=$(python3 - "$job" <<'PY'
import json, os, sys, time

path = sys.argv[1]
job = json.load(open(path))
job["testId"] = f"{os.path.splitext(os.path.basename(path))[0]}-{int(time.time())}"
print(job["testId"], file=sys.stderr)
print(json.dumps({
    "properties": {"delivery_mode": 2, "content_type": "application/json"},
    "routing_key": "test_jobs",
    "payload": json.dumps(job),
    "payload_encoding": "string",
}))
PY
)

response=$(curl -sS -u "$user:$password" -H 'content-type: application/json' \
  -X POST "$api/exchanges/%2F/amq.default/publish" -d "$body")

if [[ ! $response =~ \"routed\":[[:space:]]*true ]]; then
  echo "not published: $response (is the worker running? it declares test_jobs on start)" >&2
  exit 1
fi
echo "published to test_jobs"
