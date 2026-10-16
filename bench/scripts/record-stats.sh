#!/usr/bin/env bash
# Records CPU and memory of loadapi containers to a CSV file until Ctrl+C.
# Usage: bench/scripts/record-stats.sh OUTPUT.csv [NAME_PREFIX]
set -euo pipefail

out=${1:?usage: record-stats.sh OUTPUT.csv [NAME_PREFIX]}
prefix=${2:-loadapi-}

mkdir -p "$(dirname "$out")"
echo "timestamp,container,cpu_percent,mem_mib" > "$out"

while true; do
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}}' \
    | grep "^$prefix" \
    | awk -F',' -v ts="$ts" '{
        cpu = $2; sub(/%/, "", cpu)
        split($3, mem, " / "); value = mem[1]
        unit = value; gsub(/[0-9.]/, "", unit)
        num = value; gsub(/[A-Za-z]/, "", num)
        if (unit == "GiB") num *= 1024
        else if (unit == "KiB") num /= 1024
        else if (unit == "B") num /= 1048576
        printf "%s,%s,%s,%.1f\n", ts, $1, cpu, num
      }' >> "$out"
done