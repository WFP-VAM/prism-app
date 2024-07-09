#!/bin/bash
cd ~/prism-app/alerting
docker compose run --entrypoint 'yarn alert-worker' alerting-node

## To set up the cron job, run the following command on the server:
# contrab -e
## and then add the following line to the crontab file:
# 0 1 * * * ~/prism-app/alerting/cron_alert_run.sh
## This will run the alerting script every day at 1:00 AM.
