#!/bin/bash
cd ~/prism-app/alerting
docker compose run --entrypoint 'yarn alert-worker' alerting-node
