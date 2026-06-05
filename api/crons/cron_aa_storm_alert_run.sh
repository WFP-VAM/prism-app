#!/usr/bin/env bash
# Anticipatory-action storm alerts worker (hourly).
#
# Setup (server):
#   crontab -e
#   0 * * * * /path/to/prism-frontend/api/crons/cron_aa_storm_alert_run.sh
#
# Requires: Poetry env in api/, PRISM_ALERTS_DATABASE_URL, SMTP secrets via set_envs.sh.

set -euo pipefail

API_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$API_ROOT"

if [[ -f ./set_envs.sh ]]; then
  # shellcheck source=/dev/null
  source ./set_envs.sh
fi

PYTHONPATH=. poetry run python -m prism_app.workers.alert_runner aa-storm \
  2>&1 | tee -a "${API_ROOT}/aa_storm_alert_worker.log"
