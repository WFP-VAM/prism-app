#!/bin/bash
cd ~/prism-app/alerting

# source secrets from AWS
source ../api/set_envs.sh

docker compose run --rm --entrypoint 'yarn aa-flood-alert-worker' alerting-node 2>&1 | tee -a ~/prism-app/alerting/aa_flood_alert_worker.log

## To set up the cron job, run the following command on the server:
# crontab -e
## and then add the following line to the crontab file:
# 0 13 * * * ~/prism-app/alerting/crons/cron_aa_flood_alert_run.sh
## This will run the flood AA alerting script once daily at 13:00 UTC.
