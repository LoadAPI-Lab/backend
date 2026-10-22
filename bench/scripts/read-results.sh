#!/usr/bin/env bash
# Prints events from the test_results queue (started / finished), one JSON per line.
# By default the messages stay in the queue; with --consume they are removed.
# Usage: bench/scripts/read-results.sh [--consume]
set -euo pipefail

api=${RABBITMQ_API:-http://localhost:15672/api}
user=${RABBITMQ_USER:-loadapi}
password=${RABBITMQ_PASSWORD:-loadapi}
ackmode=ack_requeue_true
[[ ${1:-} == --consume ]] && ackmode=ack_requeue_false

curl -sS -u "$user:$password" -H 'content-type: application/json' \
  -X POST "$api/queues/%2F/test_results/get" \
  -d "{\"count\":100,\"ackmode\":\"$ackmode\",\"encoding\":\"auto\"}" \
  | python3 -c 'import json, sys; [print(m["payload"]) for m in json.load(sys.stdin)]'
