#!/bin/bash
cd ~/prism-app/alerting

# source secrets from AWS
source ../api/set_envs.sh

docker compose run --rm --entrypoint 'yarn alert-worker' alerting-node 2>&1 | tee -a ~/prism-app/alerting/alert_worker.log

## To set up the cron job, run the following command on the server:
# crontab -e
## and then add the following line to the crontab file:
# 0 1 * * * ~/prism-app/alerting/crons/cron_alert_run.sh
## This will run the alerting script every day at 1:00 AM.


