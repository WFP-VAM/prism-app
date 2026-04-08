# PRISM API

The PRISM API is a lightweight API to calculate zonal statistics.

The API has two endpoints for now.

## Endpoints

### `/stats` (POST)

Calculate zonal statistics for a raster / zones combination. Which takes as inputs through POST:

- `geotiff_url`, the link to a geotiff
- `zones_url` OR `zones`, the link to a geojson with admin boundaries / a geojson with boundaries
- `?group_by`, a key to use to group zones in the geojson
- `?geojson_out`, decide if the output should be a geojson or a list of data. Default is false -> List.
- `?intersect_comparison`, ask the API to calcuate and return `intersect_percentage`. Formatted as `>=10.1`. Comparison defaults to equality if omitted.
- `?wfs_params`, A dictionary of parameters to compute statistics using the intersection between WFS FeatureCollection response polygons with admin boundaries. The parameters are the following.
  - `url`, WFS remote service url.
  - `layer_name`, the name of the vector layer. Geometry must be POLYGON or MULTIPOLYGON.
  - `key`, Geojson property field to be extracted for each feature.
  - `?time`, Layer TIME dimension if enabled.
- `?filter_by`, A dictionary of parameters that filters the features that match the geojson property key and value specified within the request.
  - `key`, feature property key.
  - `value`, feature property value.

### `/demo` (GET)

Exposes a sample API response and takes the following query arguments:

- `?group_by`, a key to use to group zones in the geojson, eg. `ADM1_PCODE`
- `?geojson_out`, decide if the output should be a geojson or a list of data. Default is false -> List.

### `/alerts-all` (GET)

Return all the alerts data that `alert` table holds

```
curl --location --request GET 'localhost:80/alerts-all' > data.json
```

### `/alerts` (GET)

Based on the parameter from request URL, this endpoint will return the matched
alert rows from DB.

- `id` return alert data that has `id`
- TODO: more GET all operations will be supported for different query cases

```
curl --location --request GET 'localhost:80/alerts?id=3'
```

### `/alerts` (POST)

One successful call will create a new entry in database `alert` table. The JSON
data should match the model defined in `AlertModel`.

```
curl --location --request POST 'localhost:80/alerts' \
--header 'Content-Type: application/json' -d @example_alert_post.json
```

The following endpoints are related to data retrieval from KoboToolbox. Make sure
you have set the environment variables KOBO_USERNAME, KOBO_PASSWORD

### `/acled` (GET)

Returns armed conflict incidents using ACLED api. Make sure to have the defined ACLED credentials using environment variables `ACLED_API_KEY` and `ACLED_API_EMAIL`

- `iso`, Country ISO code defined in Acled file. Verify documentation.
- `limit`, Maximum number of results. 0 corresponds to all incidents.
- `?fields`, Comma separated string which specifies the fields to be returned per incident.
- `?event_date`, Return incidents only matching the given value with format YYYY-MM-DD

### `/kobo/forms` (GET)

Returns all form responses using Kobo API

- `nameField`, The name of the Kobo form.
- `datetimeField`, Field used to collect all timestamps.
- `geomField`, form field which contains lat lon coordinates.
- `measureField`, form field used for legend rendering. Backend converts string form value to number.
- `?beginDateTime`, Filter forms starting from given date.
- `?endDateTime`, Filter forms whose date field is lower than value provided.
- `?filterStatus`, Filter forms that match the given value. Possible values are 'Approved', 'Not Approved' and 'On Hold'

```
curl -X GET 'http://localhost/kobo/forms?nameField=Test%20MMR&datetimeField=_submission_time&geomField=Location&measureField=The_number&beginDateTime=2021-09-15&endDateTime=2021-09-29'
```

### `/raster_geotiff` (POST)

Generate a geotiff for any wfp raster using the stac API and saves it in S3. It returns the pre signed S3 geotiff URL.
The instance will need to have read/write access to S3. Make sure it has the necessary IAM role or credentials.

- `collection`, the name of the collection to get. For example `r3h_dekad`.
- `date`, date of the data to get. For example : `2020-09-01`.
- `lat_min`, min latitude (to define the bounding box of the geotiff).
- `long_min`, min longitude (to define the bounding box of the geotiff).
- `lat_max`, max latitude (to define the bounding box of the geotiff).
- `long_max`, max longitude (to define the bounding box of the geotiff).

## Admin UI (Starlette Admin) and CIAM OIDC

The `/admin` UI uses **CIAM OpenID Connect** (authorization code with a confidential client). PRISM provisions users in the **`users`** table (stable `ciam_sub` from the ID token) and grants **`prism.app`** / **`prism.admin`** via **`user_permissions`**.

**Authoritative CIAM integration guidance** is the WFP documentation site: [CIAM Documentation](https://docs.ciam.auth.wfp.org/). Use it for OIDC flow details, endpoint behavior, client registration, and errors—for example [Supported OpenID Connect flows](https://docs.ciam.auth.wfp.org/supported-oidc-flows/), [Login workflows](https://docs.ciam.auth.wfp.org/login-workflows/), [CIAM getting started](https://docs.ciam.auth.wfp.org/ciam-getting-started/), and [Common errors](https://docs.ciam.auth.wfp.org/common-errors/). User lifecycle (self-service vs API provisioning) is described under [Registration workflows](https://docs.ciam.auth.wfp.org/registration-workflows/).

This codebase loads OIDC metadata via **OpenID Connect Discovery** from `{PRISM_OIDC_ISSUER}/.well-known/openid-configuration`. Set **`PRISM_OIDC_ISSUER`** to the **`issuer`** string from that document (see [`.env.example`](.env.example)); it may be a path under `ciam.auth.wfp.org`, not only the site origin.

**HTTP Basic** auth in [`prism_app/auth.py`](prism_app/auth.py) against **`user_info`** is unchanged and is still used for **geospatial API routes** that depend on `validate_user` / `optional_validate_user`. It does **not** gate Starlette Admin; those are separate credentials and tables.

### Environment

See [`.env.example`](.env.example) for `PRISM_OIDC_*`, `PRISM_SESSION_SECRET`, cookie options, and `PRISM_ACCESS_SUPPORT_EMAIL`.

For **local development without CIAM**, set **`PRISM_ADMIN_AUTH_DISABLED=true`** (never in production). Example vars for tests are defaulted in [`prism_app/tests/conftest.py`](prism_app/tests/conftest.py).

### HTTP routes (main FastAPI app)

| Path | Purpose |
|------|--------|
| `GET /auth/sign-in` | Start OIDC (`?next=` optional return path). |
| `GET /auth/callback` | Registered redirect URI; exchanges code and sets session cookie. |
| `GET /auth/sign-out` | Clears PRISM session / OIDC state cookies. |
| `GET /access-not-configured` | Signed-in user with no permission rows. |
| `GET /api/admin/whoami` | JSON probe; requires session + `prism.admin`. |

`SESSION_TTL` is enforced via signed cookie payload (`exp`) and `Max-Age`.

## Alerts database migrations (Alembic)


The alerts/auth PostgreSQL schema (`alert`, `user_info`, `anticipatory_action_alerts`, `users`, `permissions`, `user_permissions`, and related enums) is modeled in SQLModel under `prism_app/database/`. **All new schema changes are made with Alembic** in this directory (`alembic.ini`, `alembic/env.py`, `alembic/versions/`). The TypeORM files under `alerting/migration/` are **historical reference only**; do not add new TypeORM migrations for this database.

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

Then insert the shared local-dev rows used by alerting workers and API smoke tests (Mozambique anticipatory-action metadata, a `local_dev_user` in `user_info`, and two sample `alert` rows):

```bash
poetry run python scripts/seed_alerts_db.py
```

This is a **standalone dev script** under [`scripts/`](./scripts/) (not part of the importable `prism_app` package or FastAPI surface). It reads [`scripts/seed_local_alerts_dev.sql`](./scripts/seed_local_alerts_dev.sql) and connects with the same `PRISM_ALERTS_DATABASE_URL` / `POSTGRES_*` rules as [`database.py`](./prism_app/database/database.py). Put those variables in `api/.env` (loaded by the script the same way as `alembic/env.py`). The seed is safe to re-run: see comments in the SQL file.

**Deploy / CI:** run `alembic upgrade head` against the alerts database using `PRISM_ALERTS_DATABASE_URL` before or as part of rolling out an API release that depends on the latest schema.

**Existing databases** that already match this schema (for example, previously migrated with TypeORM) should not re-apply the baseline `CREATE TABLE` migration. Point Alembic at the same URL and **stamp** the current head once, then use `upgrade head` for future revisions:

```bash
PRISM_ALERTS_DATABASE_URL="postgresql://..." poetry run alembic stamp prism_alerts_baseline
```

### Adding new migrations

1. Update the SQLModel definitions under `prism_app/database/` (and any related types).
2. With the alerts database reachable at the **current** schema version (usually after `alembic upgrade head`), generate a revision from the `api/` directory:

   ```bash
   PRISM_ALERTS_DATABASE_URL="postgresql://user:pass@host:5432/dbname" \
     poetry run alembic revision --autogenerate -m "short description of change"
   ```

3. Apply locally and re-test: `poetry run alembic upgrade head` (with the same URL). Useful commands: `poetry run alembic history`, `poetry run alembic current`.

## Development

To run the api locally, run:

```
make api
```

**Alerts DB from Docker:** `prism_app.database.database` uses `PRISM_ALERTS_DATABASE_URL` when set; otherwise it builds a URL from `POSTGRES_*`. `docker-compose.develop.yml` sets `PRISM_ALERTS_DATABASE_URL` to empty so the container ignores a host `api/.env` that uses `127.0.0.1` (fine for Alembic on the laptop, wrong inside Docker—there `127.0.0.1` is the API container). Use `POSTGRES_HOST` / `POSTGRES_PORT` in that compose file so the API reaches Postgres (for example `host.docker.internal` and published port `54321`, or the DB service name and `5432` when sharing a compose network).

To run flask api together with database within same network, run:

```
docker compose -f ./docker-compose.develop.yml -f ../alerting/docker-compose.yml up
```

### Tests

To run linting and tests, run:

```
make test
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
- The alerts PostgreSQL schema is current: from `api/`, run `poetry run alembic upgrade head` with `PRISM_ALERTS_DATABASE_URL` set (see **Alerts database migrations (Alembic)** above; use `alembic stamp` if the database predates Alembic and already has the tables).

To deploy, ssh into the EC2 instance:
- Get the private key and copy it to `~/.ssh/{some name}.pem`
- Add your IP address to the EC2 instance's whitelist in the AWS console
- Run `ssh -i ~/.ssh/{some name}.pem ubuntu@{Public IPv4 DNS}`
- Navigate to the api directory
- Confirm you're on the right branch and the branch is up to date
- Run `make deploy`

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
