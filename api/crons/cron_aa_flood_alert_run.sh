#!/usr/bin/env bash
# Anticipatory-action flood alerts worker (hourly, offset :10).
#
# Setup (server):
#   crontab -e
#   10 * * * * /path/to/prism-frontend/api/crons/cron_aa_flood_alert_run.sh
#
# Requires: Poetry env in api/, PRISM_ALERTS_DATABASE_URL, SMTP secrets via set_envs.sh.

set -euo pipefail

API_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$API_ROOT"

if [[ -f ./set_envs.sh ]]; then
  # shellcheck source=/dev/null
  source ./set_envs.sh
fi

PYTHONPATH=. poetry run python -m prism_app.workers.alert_runner aa-flood \
  2>&1 | tee -a "${API_ROOT}/aa_flood_alert_worker.log"
