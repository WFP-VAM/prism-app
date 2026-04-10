# WFP PRISM Alerting node

This project is part the World Food Programme's [PRISM project](https://innovation.wfp.org/project/prism).
It provides a service called `alerting-node` able to send emails when alerts are triggered.

It comes with a database which persists alerts related data. The database is provided via a docker container. See the service `alerting-db` in the file [docker-compose.yml](./docker-compose.yml)

There is a unique service running for all country specific frontends.

## Database schema and migrations

The alerting stack uses the same PostgreSQL database as the PRISM API for `alert`, `user_info`, and `anticipatory_action_alerts`. **Python/Alembic under `api/alembic/` is the sole owner of new schema migrations** for this database. The TypeORM migration history in `migration/` remains useful as a record of how production was built, but **do not add new TypeORM migrations** for these tables or enums. Change SQLModel in `api/prism_app/database/`, add an Alembic revision under `api/alembic/versions/`, and run `alembic upgrade head` with `PRISM_ALERTS_DATABASE_URL` (see `api/README.md`). For context on removed TypeORM config, see [HISTORICAL_TYPEORM.md](./HISTORICAL_TYPEORM.md).

## Functionalities

- `anticipatory action storm` alerts
  - Checks latest storm forecast reports, decides triggers, sends alert emails when necessary.
- `anticipatory action flood` alerts
  - Reads flood `dates.json` (Mozambique), evaluates `trigger_status` (bankfull/moderate/severe), sends alert emails with a map screenshot.

## Setup - anticipatory action alerts

- Alerts are triggered by a cron job running within the `alerting-node` process.
- Run `docker compose up` to launch the `alerting-node` and `alerting-db` processes.
- The system checks database entries to determine **which country** needs to be triggered.
- Currently, **Mozambique is supported**. After the DB schema exists (Alembic baseline / TypeORM history in prod), seed local data from the **API** (same repo area that owns migrations)—see **Local dev seed data** in [`api/README.md`](../api/README.md): `poetry run python scripts/seed_alerts_db.py` from `api/`. Connection vars are `PRISM_ALERTS_DATABASE_URL` or `POSTGRES_*` in `api/.env`; for host access to `alerting-db`, use port `54321` as in [`.env.example`](./.env.example).

- **country**: The target country for the alert.  
- **emails**: A list of email addresses that will receive the alert notification.  
- **prism_url**: The base URL of the PRISM platform for redirection link and screenshot capture.
- **type**: Hazard type enum: `storm` | `flood` | `drought`.

The `type` column is a PostgreSQL ENUM (`anticipatory_action_alerts_type_enum`). It was originally created by TypeORM migration `1738850000000-add-type-to-anticipatory-action-alerts.ts`; the authoritative definition for new environments is the Alembic baseline under `api/alembic/versions/`.

### Optional: threshold `alert` rows + `user_info` (local testing)

For [Starlette Admin](https://github.com/jowilf/starlette-admin) or API smoke tests, use the same seed step as above: from `api/`, run `poetry run python scripts/seed_alerts_db.py`. That executes [`api/scripts/seed_local_alerts_dev.sql`](../api/scripts/seed_local_alerts_dev.sql), which loads sample `alert` and `user_info` rows (and the Mozambique AA rows) in one shot. Re-running is safe: see comments at the top of that SQL file.

- **User password:** with `salt = 'false'`, the PRISM API validates this row using a **plain-text** password match ([`prism_app/auth.py`](../api/prism_app/auth.py))—use HTTP Basic `local_dev_user` / `localdev` when auth is enabled.

### Shared worker runner

Both storm and flood workers use a shared runner at `src/aa-common/runner.ts` to handle:
- DB connection, alert lookup by `country` and `type`, and test override wiring
- A `prepare` hook to fetch shared data once per run
- A `buildForAlert` hook to create email payloads and updated `lastStates` per alert row
- Sending payloads and updating `lastRanAt`/`lastTriggeredAt`/`lastStates`

Hazard-specific logic lives in:
- Storm: `src/aa-storm-alert/alert.ts` and `src/aa-storm-alert/worker.ts`
- Flood: `src/aa-flood-alert/alert.ts` and `src/aa-flood-alert/worker.ts`

## Test sending emails

Follow these steps to test the email sending functionality for storm alerts:

- Run `docker compose up` to launch the `alerting-node` and `alerting-db` processes
- Make sure to have at least one entry in the database (See the Setup section for more details)
- Use this command to send test emails :

```bash
# Storm
sudo docker compose run --entrypoint "yarn aa-storm-alert-worker --testEmail='email1@example.com,email2@example.com'" alerting-node

# Flood
sudo docker compose run --entrypoint "yarn aa-flood-alert-worker --testEmail='email1@example.com,email2@example.com'" alerting-node
```
- The provided emails replace the DB-configured recipients for test runs.

### Flood data source
- The flood worker reads `dates.json`: `https://data.earthobservation.vam.wfp.org/public-share/aa/flood/moz/dates.json`.
- Email triggers when `trigger_status` is one of: `bankfull`, `moderate`, `severe`.
- Email content follows the AA Flood design and includes a map screenshot and CTA link.

## CI and release checks (shared alerts database)

GitHub Actions job **`alerts_db_alembic_and_alerting`** (in [`.github/workflows/api.yml`](../.github/workflows/api.yml)) starts an ephemeral Postgres, runs `alembic upgrade head` from `api/`, then:

1. **`yarn check-alerts-db-contract`** — Validates tables/columns/types the Node workers query still match the migrated schema (`src/ci/check-alerts-db-contract.ts`). Requires `PRISM_ALERTS_DATABASE_URL`.
2. **`yarn smoke-alerts-db-pool`** — Runs real `pg` queries used by threshold and AA workers (empty tables OK; `src/ci/smoke-alerts-db-pool.ts`).
3. **`yarn smoke-alerting-workers`** — Runs `runAlertWorker()` plus AA storm/flood `SELECT`s on the same pool (`src/ci/smoke-alerting-workers.ts`; safe when there are no active alerts).

The same job then runs **`pytest`** on `test_api.py`, `test_alerting.py`, and **`test_alerts_db_integration.py`** so the API, `/stats` alerting fixture, admin list routes, and Alembic metadata align with that database. See [api/README.md](../api/README.md) (**Alerts database (CI integration + local)**).

**Before or right after the first production `alembic upgrade` on the shared alerts DB**, also smoke manually: full `alert-worker`, one AA worker **without** `--testEmail` (so the pool hits Postgres), and read-only Starlette Admin on `alert` / `user_info` / `anticipatory_action_alerts`.

## Server crons
Alert workers are running as crons on the server. Edit with: `crontab -e`
Crontab examples :
```
0 * * * *  ~/prism-app/alerting/crons/cron_aa_storm_alert_run.sh
5 * * * *  ~/prism-app/alerting/crons/cron_aa_flood_alert_run.sh
0 1 * * *  ~/prism-app/alerting/crons/cron_alert_run.sh
```
