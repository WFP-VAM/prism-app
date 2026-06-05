#!/usr/bin/env bash
# Daily enqueue for scheduled public map exports (active map_export_schedules rows).
#
# Setup (server):
#   crontab -e
#   0 2 * * * /path/to/prism-frontend/api/crons/cron_scheduled_public_maps.sh
#
# Schedules are managed via the API/Admin (POST /export-map/schedules), not a repo JSON file.
#
# Requires: Docker Compose api stack, PRISM_ALERTS_DATABASE_URL, AWS creds for dedupe artifact checks.
#
# Priority: cron enqueues at priority 100; API export jobs default 200 (see export_jobs/claim.py).
# WMS dates: GetCapabilities against https://api.earthobservation.vam.wfp.org/ows

set -euo pipefail

API_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$API_ROOT"

if [[ -f ./set_envs.sh ]]; then
  # shellcheck source=/dev/null
  source ./set_envs.sh
fi

docker compose run --rm \
  export_map_worker \
  python -m prism_app.workers.scheduled_public_maps.cron \
  2>&1 | tee -a "${API_ROOT}/scheduled_public_maps_cron.log"
