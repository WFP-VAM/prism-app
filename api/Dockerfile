FROM ghcr.io/osgeo/gdal:ubuntu-full-3.7.3

ENV PYTHONPATH=/

ENV POETRY_VERSION=1.6.1
# install poetry in this location
ENV POETRY_HOME="/opt/poetry"

# do not ask any interactive question
ENV POETRY_NO_INTERACTION=1
# set the cache location so we can mount docker buildx cache on it
ENV POETRY_CACHE_DIR=/root/.cache

# set poetry to use the system python env so we get all
# the GDAL packages which are already installed. This goes
# against best practice, but follows the logic in place before
# the switch to poetry
ENV POETRY_VIRTUALENVS_CREATE=false

ENV PATH="$POETRY_HOME/bin:$PATH"

RUN --mount=type=cache,target=/root/.cache curl -sSL https://install.python-poetry.org | python3 -

# COPY requirements.txt .
# copy pyproject so that black and isort use the right config
COPY pyproject.toml /

COPY poetry.lock /

RUN apt-get install -y ca-certificates curl gnupg lsb-release
RUN apt-get update && \
    apt-get --no-install-recommends install -y python3-pip libpq-dev curl python3-dev build-essential

RUN pip install --upgrade pip

RUN --mount=type=cache,target=/root/.cache \
    poetry install

# RUN --mount=type=cache,target=/root/.cache poetry run playwright install chromium
RUN poetry run playwright install chromium
# playwright installs a lot of apt packages
RUN --mount=type=cache,target=/root/.cache \
    --mount=type=cache,target=/var/lib/apt \
    --mount=type=cache,target=/var/cache/apt \
    poetry run playwright install-deps

# keep this copy towards the end to help with caching previous layers
COPY ./app /app

WORKDIR /app/

EXPOSE 80
