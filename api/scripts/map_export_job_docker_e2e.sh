#!/usr/bin/env bash
# Spin up api + export_map_worker + testdb (PostGIS), enqueue POST /export-map/jobs, poll until done.
#
# Prerequisites:
#   Docker, network for Playwright URLs in fixture.
#   Without EXPORT_MAP_S3_BUCKET, artifacts go to EXPORT_MAP_LOCAL_OUTPUT_DIR (default
#   /cache/map_export_artifacts in container / ./cache on host via compose volume).
#
# From repo api/ directory:
#   ./scripts/map_export_job_docker_e2e.sh
#   # or S3:
#   export EXPORT_MAP_S3_BUCKET=your-bucket
#   ./scripts/map_export_job_docker_e2e.sh
#
# Env:
#   MAP_EXPORT_E2E_API_PORT   host port (default 8888)
#   MAP_EXPORT_E2E_FIXTURE    optional JSON path (default: built from moz_export fixture in api container)
#   MAP_EXPORT_E2E_POLL_SEC   poll interval (default 5)
#   MAP_EXPORT_E2E_TIMEOUT_SEC  max wait for job (default 900)
#
# Teardown this stack:
#   ./scripts/map_export_job_docker_e2e.sh --down

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE_ARGS=(
  -f docker-compose.yml
  -f docker-compose.test.yml
  -f docker-compose.map-export-e2e.yml
)
PROJECT="${COMPOSE_PROJECT_NAME:-prism_map_export_e2e}"

COMPOSE=(docker compose "${COMPOSE_ARGS[@]}" -p "$PROJECT")

if [[ "${1:-}" == "--down" ]]; then
  "${COMPOSE[@]}" down --remove-orphans
  exit 0
fi

if [[ -z "${EXPORT_MAP_S3_BUCKET:-}" ]]; then
  export EXPORT_MAP_LOCAL_OUTPUT_DIR="${EXPORT_MAP_LOCAL_OUTPUT_DIR:-/cache/map_export_artifacts}"
fi

API_PORT="${MAP_EXPORT_E2E_API_PORT:-8888}"
POLL="${MAP_EXPORT_E2E_POLL_SEC:-5}"
TIMEOUT="${MAP_EXPORT_E2E_TIMEOUT_SEC:-900}"

echo "[1/5] Starting testdb..."
"${COMPOSE[@]}" up -d testdb

echo "[2/5] Waiting for Postgres healthy..."
for _ in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T testdb pg_isready -U postgres -d postgres >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
if ! "${COMPOSE[@]}" exec -T testdb pg_isready -U postgres -d postgres >/dev/null 2>&1; then
  echo "testdb not healthy" >&2
  exit 1
fi

echo "[3/5] Alembic migrate (one-off api container)..."
"${COMPOSE[@]}" run --rm --no-deps api bash -lc \
  'cd / && poetry run alembic -c /alembic.ini upgrade head'

echo "[4/5] Starting api + export_map_worker..."
"${COMPOSE[@]}" up -d api export_map_worker

echo "[5/5] Waiting for API..."
base="http://127.0.0.1:${API_PORT}"
for _ in $(seq 1 60); do
  if curl -fsS "$base/" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
if ! curl -fsS "$base/" >/dev/null 2>&1; then
  echo "API not up at $base" >&2
  "${COMPOSE[@]}" logs --tail 80 api >&2 || true
  exit 1
fi

tmp_post="$(mktemp)"
CLEANUP_FIXTURE=0
if [[ -n "${MAP_EXPORT_E2E_FIXTURE:-}" ]]; then
  FIXTURE="$MAP_EXPORT_E2E_FIXTURE"
  if [[ ! -f "$FIXTURE" ]]; then
    echo "Fixture not found: $FIXTURE" >&2
    exit 1
  fi
else
  FIXTURE="$(mktemp)"
  CLEANUP_FIXTURE=1
  "${COMPOSE[@]}" exec -T api bash -lc \
    'cd / && poetry run python -c "import json; from prism_app.tests.fixtures.moz_export import moz_export_map_request_dict; print(json.dumps(moz_export_map_request_dict()))"' \
    > "$FIXTURE"
fi

_cleanup() {
  rm -f "$tmp_post"
  if [[ "$CLEANUP_FIXTURE" == "1" ]]; then
    rm -f "$FIXTURE"
  fi
}
trap _cleanup EXIT

echo "POST /export-map/jobs (fixture: $FIXTURE)..."
code="$(curl -sS \
  -H 'Content-Type: application/json' \
  -d @"$FIXTURE" \
  -o "$tmp_post" \
  -w '%{http_code}' \
  "$base/export-map/jobs")"
resp="$(cat "$tmp_post")"
echo "$resp" | python3 -c 'import json,sys; json.dump(json.load(sys.stdin), sys.stdout, indent=2); print()'
if [[ "$code" != "200" && "$code" != "202" ]]; then
  echo "POST failed HTTP $code" >&2
  exit 1
fi
job_id="$(echo "$resp" | python3 -c 'import json,sys; print(json.load(sys.stdin)["job_id"])')"
status="$(echo "$resp" | python3 -c 'import json,sys; print(json.load(sys.stdin)["status"])')"

if [[ "$status" == "succeeded" ]]; then
  echo "Job already succeeded (dedupe). Fetching download_url..."
  body="$(curl -sS "$base/export-map/jobs/${job_id}")"
  echo "$body" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("download_url:", d.get("download_url")); print("local_artifact_path:", d.get("local_artifact_path"))'
  echo "OK."
  exit 0
fi
if [[ "$status" != "queued" && "$status" != "running" ]]; then
  echo "Unexpected initial status: $status" >&2
  exit 1
fi

echo "Polling job $job_id (timeout ${TIMEOUT}s)..."
t0="$(date +%s)"
while true; do
  now="$(date +%s)"
  elapsed=$((now - t0))
  if (( elapsed > TIMEOUT )); then
    echo "Timeout waiting for job" >&2
    "${COMPOSE[@]}" logs --tail 120 export_map_worker >&2 || true
    exit 1
  fi
  body="$(curl -sS "$base/export-map/jobs/${job_id}")"
  st="$(echo "$body" | python3 -c 'import json,sys; print(json.load(sys.stdin)["status"])')"
  echo "  status=$st (${elapsed}s)"
  if [[ "$st" == "succeeded" ]]; then
    echo "$body" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("download_url:", d.get("download_url")); print("local_artifact_path:", d.get("local_artifact_path"))'
    echo "OK — job succeeded."
    exit 0
  fi
  if [[ "$st" == "failed" ]]; then
    echo "$body" | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin).get("error"), indent=2))'
    exit 1
  fi
  sleep "$POLL"
done
