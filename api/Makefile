SHELL := /bin/bash

build:
	docker compose -f docker-compose.yml -f docker-compose.test.yml build
	docker compose -f docker-compose.yml -f docker-compose.test.yml pull

api:
	docker compose -f docker-compose.yml -f docker-compose.develop.yml up

deploy:
	docker network create traefik_default || true
	source set_envs.sh && docker compose build && docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d

logs:
	docker compose -f docker-compose.yml -f docker-compose.deploy.yml logs -f

api-lint:
	docker compose run --no-deps api bash -c "poetry run black ."
	docker compose run --no-deps api bash -c "poetry run isort ."

api-typecheck:
	docker compose run --no-deps api bash -c "mypy ."

test-services:
	docker compose -f docker-compose.yml -f docker-compose.test.yml up -d

api-test: test-services
	docker compose -f docker-compose.yml -f docker-compose.test.yml run api bash -c "../wait-for-it.sh frontend:3000 -t 180"
	docker compose -f docker-compose.yml -f docker-compose.test.yml run api bash -c "pytest -s tests"
	docker compose -f docker-compose.yml -f docker-compose.test.yml down

api-add-users:
	docker compose -f docker-compose.yml -f docker-compose.develop.yml run api bash -c "python scripts/add_users.py"

BACKEND_COVERAGE=poetry run pytest . --cov-fail-under=30 --cov-report term-missing
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
