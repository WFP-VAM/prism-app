#!/usr/bin/env bash
# Daily enqueue for scheduled public map exports (reads JSON config, writes map_export_jobs).
#
# Setup (server):
#   crontab -e
#   0 2 * * * /path/to/prism-frontend/api/crons/cron_scheduled_public_maps.sh
#
# Requires: Docker Compose api stack, PRISM_ALERTS_DATABASE_URL, AWS creds for dedupe artifact checks.
# Place real config at SCHEDULED_PUBLIC_MAPS_CONFIG (host path); it is mounted read-only into the container.
#
# Priority: cron enqueues at priority 100; API export jobs default 200 (see export_jobs/claim.py).
# WMS dates: default OWS https://api.earthobservation.vam.wfp.org/ows — override with SCHEDULED_PUBLIC_MAPS_WMS_BASE if needed.
# Alembic: map_export_schedules revisions were removed from this repo; existing DBs may need manual
# cleanup of map_export_schedules + schedule_id and ``alembic stamp map_export_job_priority_001``.

set -euo pipefail

API_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$API_ROOT"

if [[ -f ./set_envs.sh ]]; then
  # shellcheck source=/dev/null
  source ./set_envs.sh
fi

HOST_CONFIG="${SCHEDULED_PUBLIC_MAPS_CONFIG:-${API_ROOT}/prism_app/workers/scheduled_public_maps/config/scheduled_public_maps.json}"
CONTAINER_CONFIG="${SCHEDULED_PUBLIC_MAPS_CONTAINER_PATH:-/config/scheduled_public_maps.json}"

if [[ ! -f "${HOST_CONFIG}" ]]; then
  echo "error: config file missing: ${HOST_CONFIG}" >&2
  echo "Copy api/prism_app/workers/scheduled_public_maps/config/scheduled_public_maps.example.json to api/prism_app/workers/scheduled_public_maps/config/scheduled_public_maps.json (or set SCHEDULED_PUBLIC_MAPS_CONFIG)." >&2
  exit 1
fi

docker compose run --rm \
  -v "${HOST_CONFIG}:${CONTAINER_CONFIG}:ro" \
  -e "SCHEDULED_PUBLIC_MAPS_CONFIG=${CONTAINER_CONFIG}" \
  export_map_worker \
  python -m prism_app.workers.scheduled_public_maps.cron --config "${CONTAINER_CONFIG}" \
  2>&1 | tee -a "${API_ROOT}/scheduled_public_maps_cron.log"
