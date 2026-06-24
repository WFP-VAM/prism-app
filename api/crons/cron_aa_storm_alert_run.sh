#!/usr/bin/env bash
# Anticipatory-action storm alerts worker (hourly).
#
# Setup (server):
#   crontab -e
#   0 * * * * /path/to/prism-frontend/api/crons/cron_aa_storm_alert_run.sh
#
# Requires: Docker Compose api stack, PRISM_ALERTS_DATABASE_URL, SMTP secrets via set_envs.sh.

CRONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${CRONS_DIR}/_compose_run.sh" aa_storm_alert_worker -- \
  python -m prism_app.workers.alert_runner aa-storm
