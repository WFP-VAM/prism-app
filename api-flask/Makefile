api-lint:
	docker-compose run --no-deps api bash -c "flake8 ."
	docker-compose run --no-deps api bash -c "pydocstyle ."

api-test:
	docker-compose run --no-deps pytest -s tests

BACKEND_COVERAGE=pytest --cov=app --cov-config .coveragerc --cov-fail-under=84 --cov-report term-missing
api-coverage:
	docker-compose run --no-deps api ${BACKEND_COVERAGE}

frontend-test:
	docker-compose run frontend bash -c "yarn test"

# Run tests for all components.
test:
	$(MAKE) api-lint
	$(MAKE) api-test
	# $(MAKE) api-coverage

# [Dummy dependency to force a make command to always run.]
FORCE:
