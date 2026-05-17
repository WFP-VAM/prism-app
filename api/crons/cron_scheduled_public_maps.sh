#!/usr/bin/env bash
# Daily enqueue for scheduled public map exports (reads JSON config, writes map_export_jobs).
#
# Setup (server):
#   crontab -e
#   0 2 * * * /path/to/prism-frontend/api/crons/cron_scheduled_public_maps.sh
#
# Config (edit in repo): api/prism_app/workers/scheduled_public_maps/config/scheduled_public_maps.json
#
# Requires: Docker Compose api stack, PRISM_ALERTS_DATABASE_URL, AWS creds for dedupe artifact checks.
#
# Priority: cron enqueues at priority 100; API export jobs default 200 (see export_jobs/claim.py).
# WMS dates: GetCapabilities against https://api.earthobservation.vam.wfp.org/ows
# Alembic: map_export_schedules revisions were removed from this repo; existing DBs may need manual
# cleanup of map_export_schedules + schedule_id and ``alembic stamp map_export_job_priority_001``.

set -euo pipefail

API_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$API_ROOT"

if [[ -f ./set_envs.sh ]]; then
  # shellcheck source=/dev/null
  source ./set_envs.sh
fi

CONFIG_JSON="${API_ROOT}/prism_app/workers/scheduled_public_maps/config/scheduled_public_maps.json"

if [[ ! -f "${CONFIG_JSON}" ]]; then
  echo "error: config file missing: ${CONFIG_JSON}" >&2
  exit 1
fi

docker compose run --rm \
  export_map_worker \
  python -m prism_app.workers.scheduled_public_maps.cron \
  2>&1 | tee -a "${API_ROOT}/scheduled_public_maps_cron.log"
