SHELL := /bin/bash

build:
	docker compose -f docker-compose.yml -f docker-compose.test.yml build --no-cache
	docker compose -f docker-compose.yml -f docker-compose.test.yml pull

# CI: use layer cache; (no --no-cache)
ci-build:
	docker compose -f docker-compose.yml -f docker-compose.test.yml build
	docker compose -f docker-compose.yml -f docker-compose.test.yml pull

api:
	docker compose -f docker-compose.yml -f docker-compose.develop.yml up

deploy:
	docker network create traefik_default || true
	source set_envs.sh && docker compose build && docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d --scale export_map_worker=2

logs:
	source set_envs.sh && docker compose -f docker-compose.yml -f docker-compose.deploy.yml logs --tail=500 -f --timestamps

api-lint:
	poetry run black --check .
	poetry run isort --check .

api-typecheck:
	docker compose run --no-deps api bash -c "mypy ."

test-services:
	docker compose -f docker-compose.yml -f docker-compose.test.yml up -d --remove-orphans

# Use exec (not run) so commands share the long-running api container's network — one-off
# `docker compose run api` containers often cannot reach testdb by hostname.
# testdb readiness is enforced by docker-compose.test.yml (depends_on + healthcheck); no wait-for-it needed.
api-test: test-services
	docker compose -f docker-compose.yml -f docker-compose.test.yml exec -T api bash -c "cd / && poetry run alembic -c /alembic.ini upgrade head"
	docker compose -f docker-compose.yml -f docker-compose.test.yml exec -T api bash -c "/wait-for-it.sh frontend:3300 -t 180"
	docker compose -f docker-compose.yml -f docker-compose.test.yml exec -T api bash -c "cd / && PYTHONPATH=. poetry run pytest -s prism_app/tests -v --tb=long"
	docker compose -f docker-compose.yml -f docker-compose.test.yml down

DEV_COMPOSE=docker compose -f docker-compose.yml -f docker-compose.develop.yml

db-migrate:
	$(DEV_COMPOSE) exec -T api bash -c "cd / && poetry run alembic -c /alembic.ini upgrade head"

# Downgrades the dev database by one revision
db-downgrade:
	$(DEV_COMPOSE) exec -T api bash -c "cd / && poetry run alembic -c /alembic.ini downgrade -1"

db-seed: db-migrate
	$(DEV_COMPOSE) exec -T api bash -c "poetry run python /scripts/seed_alerts_db.py"

# Enqueue map_export_jobs from active map_export_schedules (requires `make api` running).
schedule-cron:
	$(DEV_COMPOSE) exec -T api poetry run python -m prism_app.workers.scheduled_public_maps.cron

schedule-cron-dry-run:
	$(DEV_COMPOSE) exec -T api poetry run python -m prism_app.workers.scheduled_public_maps.cron --dry-run

api-add-users:
	docker compose -f docker-compose.yml -f docker-compose.develop.yml run api bash -c "python scripts/add_users.py"

BACKEND_COVERAGE=poetry run pytest --cov=. --cov-fail-under=50 --cov-report term-missing
api-coverage:
	docker compose run --no-deps api ${BACKEND_COVERAGE}

# AA flood + storm + threshold emails → Ethereal (Playwright in api image). PRISM_E2E_* optional on host.
api-alert-email-e2e:
	./scripts/alert_email_ethereal_e2e_docker.sh

# AA test email via Ethereal (develop ``db`` on Docker network + Playwright map capture).
# Usage: make send-test-email EMAIL=you@example.com [WORKER=aa-flood|aa-storm]
WORKER ?= aa-flood
EMAIL ?= you@example.com
send-test-email:
	PRISM_ALERTS_USE_ETHEREAL=true $(DEV_COMPOSE) run --rm \
	  -e PRISM_ALERTS_USE_ETHEREAL \
	  export_map_worker \
	  python -m prism_app.workers.alert_runner $(WORKER) --test-email='$(EMAIL)'

# Run tests for all components.
test:
	$(MAKE) api-lint
	$(MAKE) api-test
	$(MAKE) api-coverage

bash:
	docker compose -f docker-compose.yml -f docker-compose.develop.yml run api bash

# [Dummy dependency to force a make command to always run.]
FORCE:

# Notes on docker errors
# If you are getting "permission denied" errors while shutting/restarting the API, you can try using the following command:
# sudo aa-remove-unknown
