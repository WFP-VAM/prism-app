SHELL := /bin/bash

build:
	docker compose -f docker-compose.yml -f docker-compose.test.yml build --no-cache
	docker compose -f docker-compose.yml -f docker-compose.test.yml pull

api:
	docker compose -f docker-compose.yml -f docker-compose.develop.yml up

deploy:
	docker network create traefik_default || true
	source set_envs.sh && docker compose build && docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d

logs:
	source set_envs.sh && docker compose -f docker-compose.yml -f docker-compose.deploy.yml logs --tail=500 -f

api-lint:
	docker compose run --no-deps api bash -c "poetry run black ."
	docker compose run --no-deps api bash -c "poetry run isort ."

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
	docker compose -f docker-compose.yml -f docker-compose.test.yml exec -T api bash -c "pytest -s tests -v --tb=long"
	docker compose -f docker-compose.yml -f docker-compose.test.yml down

api-add-users:
	docker compose -f docker-compose.yml -f docker-compose.develop.yml run api bash -c "python scripts/add_users.py"

BACKEND_COVERAGE=poetry run pytest --cov=. --cov-fail-under=50 --cov-report term-missing
api-coverage:
	docker compose run --no-deps api ${BACKEND_COVERAGE}

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
