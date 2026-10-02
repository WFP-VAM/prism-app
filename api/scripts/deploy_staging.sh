#!/usr/bin/env bash
# Resource-capped staging stack on the same EC2 as prod.
# Run from api/ via `make deploy-staging`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f ./set_envs.sh ]]; then
  echo "error: missing ./set_envs.sh in $ROOT" >&2
  exit 1
fi

# shellcheck disable=SC1091
source ./set_envs.sh
# shellcheck source=staging_env.sh
source ./scripts/staging_env.sh
staging_apply_overrides

docker network create traefik_default || true

docker compose build

# Keep API and worker down until the staging schema matches this checkout.
docker compose stop api export_map_worker || true
docker compose up -d db

ready=0
for _ in $(seq 1 40); do
  if docker compose exec -T db pg_isready -h localhost -U postgres -d postgres >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 3
done
if [[ "$ready" != 1 ]]; then
  echo "error: staging database was not ready in time" >&2
  exit 1
fi

if ! docker compose run --rm api poetry run alembic -c /alembic.ini upgrade head; then
  docker compose stop api export_map_worker || true
  echo "error: alembic upgrade failed; staging api and worker left stopped" >&2
  exit 1
fi

docker compose up -d --scale export_map_worker=1

HEALTHCHECK_STRICT=1 ./scripts/health_check.sh
