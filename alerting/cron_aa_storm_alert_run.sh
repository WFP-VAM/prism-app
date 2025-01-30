#!/bin/bash
cd ~/prism-app/alerting

# source secrets from AWS
source ../api/set_envs.sh

docker compose run --entrypoint 'yarn aa-storm-alert-worker' alerting-node 2>&1 | tee -a ~/prism-app/alerting/aa_storm_alert_worker.log

## To set up the cron job, run the following command on the server:
# crontab -e
## and then add the following line to the crontab file:
# 0 * * * * ~/prism-app/alerting/cron_aa_storm_alert_run.sh
## This will run the alerting script every hour at minute 0.
