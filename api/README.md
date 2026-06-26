# PRISM API

The PRISM API encompasses a broad set of capabilities:
- The PRISM Admin Console (CIAM OIDC authentication)
- Zonal statistics — aggregate rasters over polygons
- Raster GeoTIFF generation from STAC-backed sources
- Alerts REST API and related anticipatory-action records
- Kobo form metadata and responses, HDC chart data, ACLED pulls, and Google Floods
- Report downloads and server-side map export (merged PDF or ZIP of PNGs)

## Quick start (local development)

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Environment

Copy the example env file and enable local auth bypass:

```bash
cp .env.example .env
```

Edit `api/.env` and set:

```
PRISM_ADMIN_AUTH_DISABLED=true
```

This skips CIAM OIDC so you can access `/admin` without credentials. See [Admin UI and CIAM OIDC](#admin-ui-starlette-admin-and-ciam-oidc) for the full auth setup.

You also need `KOBO_USERNAME` and `KOBO_PASSWORD` exported in your shell (the compose file requires them):

```bash
export KOBO_USERNAME=kobo_user KOBO_PASSWORD=test
```

### 2. Start the API and database

```bash
make api
```

This starts four containers via `docker-compose.develop.yml`:
- **`db`** — PostGIS (Postgres) on host port **54321**
- **`rustfs`** — local S3-compatible storage for map export artifacts (API port **9000**, console **9001**)
- **`api`** — FastAPI (uvicorn with hot reload) on host port **80**
- **`export_map_worker`** — polls `map_export_jobs`, runs Playwright export, writes artifacts to RustFS

### Local map export storage (RustFS)

Production stores batch and scheduled map exports in **AWS S3** (`EXPORT_MAP_S3_BUCKET`, e.g. `s3://prism-wfp/batch-maps`). Local dev uses **RustFS** so the same code paths run without real AWS credentials for artifacts.

`docker-compose.develop.yml` sets this automatically for **`api`** and **`export_map_worker`**:

| Variable | Local value | Role |
|---|---|---|
| `EXPORT_MAP_S3_BUCKET` | `prism-dev` | Bucket created by `rustfs-init` |
| `AWS_ENDPOINT_URL` | `http://rustfs:9000` | Server-side S3 calls (worker, API inside Docker) |
| `AWS_PRESIGN_ENDPOINT_URL` | `http://localhost:9000` | Presigned download URLs the browser can reach |

RustFS console: **http://localhost:9001** (login `rustfsadmin` / `rustfsadmin`).

These flows stay aligned with production when `EXPORT_MAP_S3_BUCKET` is set and `EXPORT_MAP_LOCAL_OUTPUT_DIR` is empty (the compose default):

1. **Write** — `export_map_worker`
2. **Dedupe** — `POST /export-map/jobs` and `scheduled_public_maps` cron
3. **Download** — `GET /export-map/jobs/{id}` and admin schedule download

The alternative dev mode, `EXPORT_MAP_LOCAL_OUTPUT_DIR`, writes `file://…` URIs to disk instead of S3 and skips the RustFS/prod-aligned path.

### 3. Run migrations and seed data

In a **second terminal** (while `make api` is running):

```bash
make db-migrate
make db-seed
```

`db-migrate` applies Alembic migrations (`upgrade head`). `db-seed` runs migrations first, then inserts sample dev data (Mozambique AA metadata, a `local_dev_user`, example alert rows, and five `[Seed]` map export schedules for cron/download QA).

### 4. Verify

| What | URL / command |
|------|---------------|
| API docs | http://localhost/docs |
| Admin UI | http://localhost/admin |

Environment variables and CIAM-related settings are documented in [AUTH.md](AUTH.md#environment-variables).

## Endpoints

Full, interactive API documentation (request/response schemas, "Try it out") is available at the **Swagger UI**: <https://prism-api.ovio.org/docs>

For local development the same docs are served at <http://localhost/docs> once the API is running.

## Admin UI (Starlette Admin) and CIAM OIDC

`/admin` is gated by **CIAM OpenID Connect** (authorization-code flow, confidential client). [CIAM Documentation](https://docs.ciam.auth.wfp.org/) is the authoritative reference for OIDC flow details, client registration, and errors.

> **Note:** HTTP Basic auth (`prism_app/auth.py`, `kobo_users` table) is separate and only gates geospatial API routes — not Admin.

### Quick reference

| Concept | Detail |
|---|---|
| Identity | `users` table, keyed on stable `ciam_sub` from the ID token |
| Authorization | `user_permissions` → `permissions.code` |
| Library | [Authlib](https://docs.authlib.org/) (PKCE, token endpoint, JWKS) + joserfc |

OIDC and related environment variables are listed in [AUTH.md](AUTH.md#ciam-oidc-and-admin-session).

### Session secret (`PRISM_SESSION_SECRET`)

Signs the session cookie and OIDC state tokens.

| Context | Behavior |
|---|---|
| **Production** | Required — set `PRISM_ENV=production`, app fails fast if missing. Use the same value on all hosts. |
| **Local/test** | Leave empty — ephemeral key generated at startup (warning logged); lost on restart. |

```bash
# Generate a stable secret (paste into api/.env as PRISM_SESSION_SECRET=...)
openssl rand -hex 32
```

> In AWS store in Secrets Manager / SSM. Rotating the secret logs everyone out.

## Alerts database migrations (Alembic)

The alerts/auth PostgreSQL schema (`alert`, `kobo_users`, `anticipatory_action_alerts`, `users`, `permissions`, `user_permissions`, related enums) is modeled in SQLModel under `prism_app/database/`. **New schema changes use Alembic** in this directory (`alembic.ini`, `alembic/env.py`, `alembic/versions/`).
**Connection URL** is the same as the API: `PRISM_ALERTS_DATABASE_URL`, or the `POSTGRES_*` variables documented in `prism_app/database/database.py`. For local `poetry run alembic` commands, you can put `PRISM_ALERTS_DATABASE_URL` in `api/.env`; `alembic/env.py` loads that file into the process environment before connecting (unlike the shell, Python does not read `.env` by itself).

From the `api/` directory:

```bash
# Apply pending revisions (new or empty databases)
PRISM_ALERTS_DATABASE_URL="postgresql://user:pass@host:5432/dbname" poetry run alembic upgrade head
```

### Local dev seed data

**Prerequisite:** the alerts database must already reflect the current Alembic head (otherwise seeding will error on missing tables/enums). From `api/`, with `PRISM_ALERTS_DATABASE_URL` or `POSTGRES_*` set in `.env` and Postgres reachable:

```bash
poetry run alembic upgrade head
```

Then insert the shared local-dev rows used by alerting workers and API smoke tests (Mozambique anticipatory-action metadata, a `local_dev_user` in `kobo_users`, and two sample `alert` rows):

```bash
poetry run python scripts/seed_alerts_db.py
```

This is a **standalone dev script** under [`scripts/`](./scripts/) (not part of the importable `prism_app` package or FastAPI surface). It reads [`scripts/seed_local_alerts_dev.sql`](./scripts/seed_local_alerts_dev.sql) and connects with the same `PRISM_ALERTS_DATABASE_URL` / `POSTGRES_*` rules as [`database.py`](./prism_app/database/database.py). Put those variables in `api/.env` (loaded by the script the same way as `alembic/env.py`). The seed is safe to re-run: see comments in the SQL file.

### Tests

To run linting and tests, run:

```
make test
```

#### Alerts database (CI integration + local

GitHub Actions job **`alerts_db_alembic_and_alerting`** (`.github/workflows/api.yml`) applies **`alembic upgrade head`** to an empty Postgres instance, runs the **Python** alerts DB contract + worker smoke (`prism_app.ci.*`, `prism_app.workers.alert_runner smoke`), then runs **`pytest`** on `prism_app/tests/test_api.py`, `test_alerting.py`, and **`test_alerts_db_integration.py`** against that same database.

On the lightweight Ubuntu runner, **`test_stats_endpoint_masked`** is skipped (`SKIP_GDAL_MASK_STATS_TEST=1`) because it needs a full **GDAL** CLI (`gdal_calc.py`). **`make api-test`** in Docker still executes the full API test module, including the masked stats case.

Locally (migrated alerts DB, same env vars as elsewhere). Use a real URL; placeholder hosts such as `...` will skip DB-backed tests or fail DNS. From **`api/`**:

```bash
cd api
export KOBO_USERNAME=kobo_user KOBO_PASSWORD=test
export PRISM_ALERTS_DATABASE_URL='postgresql://postgres:!ChangeMe!@127.0.0.1:54321/postgres'
SKIP_GDAL_MASK_STATS_TEST=1 PYTHONPATH=. poetry run pytest \
  prism_app/tests/test_api.py \
  prism_app/tests/test_alerting.py \
  prism_app/tests/test_alerts_db_integration.py -v --tb=short
```

**Manual — Starlette Admin (read-only):** With the API up on the alerts database, open **`/admin`**, then list routes **`/admin/alert-model/list`**, **`/admin/kobo-user/list`**, **`/admin/anticipatory-action-alerts/list`**. Confirm list and detail views; create/edit/delete remain off until auth is added.

**Manual — alert workers:** From `api/` run **`docker compose run --rm export_map_worker python -m prism_app.workers.alert_runner threshold`** (and `aa-storm` / `aa-flood`) against a seeded dev database. For local iteration without Docker: **`PYTHONPATH=. poetry run python -m prism_app.workers.alert_runner …`**.

**Local alerts database:** Use the **`db`** service from [`docker-compose.develop.yml`](./docker-compose.develop.yml) (see **Start the API and database** above). To run Postgres only: `docker compose -f docker-compose.yml -f docker-compose.develop.yml up db`. Host port **54321**; see `PRISM_ALERTS_DATABASE_URL` in `.env.example`.

**Server crons:** Scripts under [`crons/`](./crons/) run one-shot commands in **`export_map_worker`** (same image as scheduled public maps):

```
0 * * * *  ~/prism-app/api/crons/cron_aa_storm_alert_run.sh
10 * * * * ~/prism-app/api/crons/cron_aa_flood_alert_run.sh
0 1 * * *  ~/prism-app/api/crons/cron_alert_run.sh
```

AA emails use Playwright against **`prism_url`** on each alert row (typically a public frontend `/export` URL reachable from the container).

AA test recipients:

```bash
docker compose run --rm export_map_worker python -m prism_app.workers.alert_runner aa-storm --test-email='a@x.com,b@y.com'
docker compose run --rm export_map_worker python -m prism_app.workers.alert_runner aa-flood --test-email='a@x.com'
```

#### Debugging playwright tests

To run python tests outside of docker, run "make localtests". This will set them up to run outside docker, so that
playwright can run in debug mode, with a visible browser.

- start the frontend in docker with `make test-services`.
- in a shell (tested in bash only):

```bash
cd api/app
mv tests/conftest.py-template tests/conftest.py
KOBO_USERNAME=ovio KOBO_PW=pwd PWDEBUG=1 poetry run pytest -s tests -k test_download_report
```

This should open playwright in debug mode, with a browser window and a debugging one. More info: https://playwright.dev/python/docs/debug

## Deployments

We are using [docs.traefik.io](https://docs.traefik.io/) to deploy the application to an EC2 instance in AWS.

To deploy the application, we need to ensure the environment variables are set in the file `docker-compose.deploy.yml`. You can either use the environment variables in `set_envs.sh` to configure the deployment or you can manually set the environment variables in the `docker-compose.deploy.yml` file.

Before deploying, make sure that:
- The EC2 instance you are using is assigned an IAM role that has access to S3.
- All the necessary secrets needed in `set_envs.sh` have been configured in the AWS secrets manager.
- The alerts PostgreSQL schema is current: from `api/`, run `poetry run alembic upgrade head` 

To deploy, ssh into the EC2 instance:
- Get the private key and copy it to `~/.ssh/{some name}.pem`
- Add your IP address to the EC2 instance's whitelist in the AWS console
- Run `ssh -i ~/.ssh/{some name}.pem ubuntu@{Public IPv4 DNS}`
- Navigate to the api directory
- Confirm you're on the right branch and the branch is up to date
- Optional: if any database migrations are in the deploying branch, open a bash shell to the API container. Use the `poetry run alembic heads` and `poetry run alembic current` commands first to ensure the proper migration will be applied, and once verified, run `poetry run alembic upgrade head` to run the migration.
- Run `make deploy`

### Automated deploys (cron)

`api/crons/cron_api_auto_deploy.sh` is a cron-safe script that automatically redeploys the API when the target branch advances. It is idempotent (no-ops if the branch SHA is unchanged), uses `flock` for mutual exclusion, and optionally gates a successful deploy on a healthcheck URL.

Add a daily crontab entry on the EC2 instance (edit with `crontab -e`):

```bash
# Daily at 01:00 – auto-deploy API when master advances
0 1 * * * APP_DIR="$HOME/prism-app/api" BRANCH=master HEALTHCHECK_URL="http://127.0.0.1/health" $HOME/prism-app/api/crons/cron_api_auto_deploy.sh >> $HOME/prism-app/api/auto_deploy.log 2>&1
```

To roll back to the previously deployed SHA, run `api/crons/rollback_api_to_prev.sh`.

There are a few known issues happening from time to time

- `permission denied` when restarting or killing a docker image. To fix it, run `sudo aa-remove-unknown` and re-run your command.

- `address already in use`. To bypass it, run the following commands for the ports you need:

```
# Find process ids
sudo lsof -i -P -n | grep PORT
# Kill processes
sudo kill PROCESS_ID
```

- `OOS — out of storage` when creating new deployments in AWS. This is due to unmounted (historic) docker volumes in long running EC2 instances. To delete these volumes and free up storage, run the following while ssh-ed into your EC2 instance: `docker system prune -a` and `docker volume prune -a`
