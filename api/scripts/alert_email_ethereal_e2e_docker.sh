#!/usr/bin/env bash
# AA alert email E2E: real map screenshot + Ethereal (Chromium is in api image).
#
#   make -C api api-alert-email-e2e
#   # or: ./scripts/alert_email_ethereal_e2e_docker.sh
#
# Optional env on host: PRISM_E2E_* — see prism_app/tests/test_alert_email_e2e_ethereal.py

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PRISM_ALERT_EMAIL_E2E="${PRISM_ALERT_EMAIL_E2E:-1}"

docker compose run --rm --no-deps \
  -e PRISM_ALERT_EMAIL_E2E \
  -e PRISM_ALERTS_USE_ETHEREAL \
  -e PRISM_E2E_PRISM_BASE_URL \
  -e PRISM_E2E_FLOOD_DATE \
  -e PRISM_E2E_FLOOD_TRIGGER \
  -e PRISM_E2E_MAP_WAIT_MS \
  -e PRISM_E2E_STORM_SCREENSHOT_URL \
  -e PRISM_E2E_STORM_CYCLONE_NAME \
  -e PRISM_E2E_STORM_TIME \
  -e PRISM_E2E_STORM_READINESS \
  -e PRISM_E2E_STORM_ACTIVATED \
  -e PRISM_E2E_STORM_DISTRICTS64 \
  api bash -lc 'cd /prism_app && PYTHONPATH=/ poetry run pytest tests/test_alert_email_e2e_ethereal.py -v -s'
