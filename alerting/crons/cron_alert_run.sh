#!/bin/bash
cd ~/prism-app/api

# source secrets from AWS
source set_envs.sh

PYTHONPATH=. poetry run python -m prism_app.worker.alert_runner threshold 2>&1 | tee -a ~/prism-app/api/alert_worker.log

## crontab example (daily 1:00):
# 0 1 * * * ~/prism-app/alerting/crons/cron_alert_run.sh
