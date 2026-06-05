#!/usr/bin/env bash
# Threshold alerts worker (daily).
#
# Setup (server):
#   crontab -e
#   0 1 * * * /path/to/prism-frontend/api/crons/cron_alert_run.sh
#
# Requires: Docker Compose api stack, PRISM_ALERTS_DATABASE_URL, SMTP secrets via set_envs.sh.

CRONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${CRONS_DIR}/_compose_run.sh" alert_worker -- \
  python -m prism_app.workers.alert_runner threshold
