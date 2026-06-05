#!/bin/bash
cd ~/prism-app/api

source set_envs.sh

PYTHONPATH=. poetry run python -m prism_app.workers.alert_runner aa-storm 2>&1 | tee -a ~/prism-app/api/aa_storm_alert_worker.log

## crontab example (hourly):
# 0 * * * * ~/prism-app/alerting/crons/cron_aa_storm_alert_run.sh
