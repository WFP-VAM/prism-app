api:
	docker-compose -f docker-compose.yml -f docker-compose.develop.yml up

deploy:
	docker-compose build && docker-compose -f docker-compose.yml -f docker-compose.deploy.yml up -d

logs:
	docker-compose -f docker-compose.yml -f docker-compose.deploy.yml logs -f

api-lint:
	docker-compose run --no-deps api bash -c "flake8 ."
	docker-compose run --no-deps api bash -c "pydocstyle ."

api-test:
	docker-compose run --no-deps api bash -c "pytest -s tests"

BACKEND_COVERAGE=pytest --cov=app --cov-config .coveragerc --cov-fail-under=30 --cov-report term-missing
api-coverage:
	docker-compose run --no-deps api ${BACKEND_COVERAGE}

# Run tests for all components.
test:
	$(MAKE) api-lint
	$(MAKE) api-test
	$(MAKE) api-coverage

# [Dummy dependency to force a make command to always run.]
FORCE:
