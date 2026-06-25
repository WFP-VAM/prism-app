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

CRONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${CRONS_DIR}/_compose_run.sh" scheduled_public_maps_cron -- \
  python -m prism_app.workers.scheduled_public_maps.cron
