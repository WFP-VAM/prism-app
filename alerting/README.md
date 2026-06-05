# WFP PRISM Alerting

**Runtime:** threshold + anticipatory-action (storm / flood) workers live in **`../api`** (`prism_app/alert_workers/`, `prism_app/worker/alert_runner.py`). This directory keeps **yarn script aliases** and **local Postgres** for development.

## Database (local)

`docker compose up` starts **`alerting-db`** only (PostGIS on host port **54321**). Point `PRISM_ALERTS_DATABASE_URL` at it when running Alembic / workers from `api/`.

Schema migrations: **Alembic in `api/`** only (`api/README.md`).

## Yarn commands (delegate to Poetry)

From **`alerting/`** (requires Poetry env in `../api`):

| Script | Purpose |
|--------|---------|
| `yarn alert-worker` | Threshold alerts |
| `yarn aa-storm-alert-worker` | AA storm |
| `yarn aa-flood-alert-worker` | AA flood |
| `yarn check-alerts-db-contract` | CI schema contract |
| `yarn smoke-alerts-db-pool` | CI DB pool smoke |
| `yarn smoke-alerting-workers` | CI worker smoke |

AA test recipients (Python argparse):

```bash
cd ../api
PYTHONPATH=. poetry run python -m prism_app.workers.alert_runner aa-storm --test-email='a@x.com,b@y.com'
PYTHONPATH=. poetry run python -m prism_app.workers.alert_runner aa-flood --test-email='a@x.com'
```

## Server crons

Shell scripts under `crons/` invoke the API worker module; edit with `crontab -e`. Examples:

```
0 * * * *  ~/prism-app/alerting/crons/cron_aa_storm_alert_run.sh
10 * * * * ~/prism-app/alerting/crons/cron_aa_flood_alert_run.sh
0 1 * * *  ~/prism-app/alerting/crons/cron_alert_run.sh
```

## CI

See **`alerts_db_alembic_and_alerting`** in `.github/workflows/api.yml`: Python contract + smoke, then pytest.
