FROM ghcr.io/osgeo/gdal:ubuntu-full-3.11.1
# gdal 3.11.1 uses ubuntu 24.04 and python 3.12

# we use poetry to install our dependencies in a venv separate from
# the docker image system python environment

ENV PYTHONPATH=/

ENV POETRY_VERSION=2.2.1
# install poetry in this location
ENV POETRY_HOME="/opt/poetry"

# do not ask any interactive question
ENV POETRY_NO_INTERACTION=1
# set the cache location so we can mount docker buildx cache on it
ENV POETRY_CACHE_DIR=/root/.cache

# it seems impossible to set ENV in docker images to the output of a command
# (see https://github.com/moby/moby/issues/29110)
# so we cannot know where poetry puts its venv, unless we force it inside the source
ENV POETRY_VIRTUALENVS_IN_PROJECT=true

# PATH:
# /.venv/bin is where poetry installs our packages (because of IN_PROJECT above)
# $POETRY_HOME/bin is where poetry itself is
ENV PATH="/.venv/bin:$POETRY_HOME/bin:$PATH"

RUN --mount=type=cache,target=/root/.cache curl -sSL https://install.python-poetry.org | python3 -

# copy pyproject so that black and isort use the right config
COPY pyproject.toml /

COPY poetry.lock /

RUN --mount=type=cache,target=/var/cache/apt \
    DEBIAN_FRONTEND=noninteractive apt-get update --fix-missing && \
    DEBIAN_FRONTEND=noninteractive apt-get --no-install-recommends install -y python3-pip libpq-dev curl python3-dev build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN --mount=type=cache,target=/root/.cache \
    poetry install

# we must run the playwright install command without mounting the cache, as it seems
# that installed binaries end up being removed from the image if the cache is used
RUN poetry run playwright install chromium

# playwright installs a lot of apt packages to support its browser
RUN --mount=type=cache,target=/root/.cache \
    --mount=type=cache,target=/var/lib/apt \
    --mount=type=cache,target=/var/cache/apt \
    DEBIAN_FRONTEND=noninteractive poetry run playwright install-deps

# keep this copy towards the end to help with caching previous layers
COPY ./prism_app /prism_app

WORKDIR /prism_app/

EXPOSE 80
