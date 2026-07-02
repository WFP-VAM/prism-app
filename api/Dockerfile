# syntax=docker/dockerfile:1.4
FROM ghcr.io/osgeo/gdal:ubuntu-full-3.13.1
# gdal 3.13.1 uses ubuntu 26.04 and python 3.14

# we use poetry to install our dependencies in a venv separate from
# the docker image system python environment

ENV PYTHONPATH=/

ENV POETRY_VERSION=2.3.3
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

# Upgrade pip + tooling (CVE-2026-1703 pip, CVE-2026-24049 wheel, CVE-2026-23949 jaraco.context via setuptools vendor refresh)
RUN poetry run pip install --upgrade 'pip>=26.1.2' 'setuptools>=82.0.0' 'wheel>=0.46.2' 'jaraco.context>=6.1.0'

# we must run the playwright install command without mounting the cache, as it seems
# that installed binaries end up being removed from the image if the cache is used
RUN poetry run playwright install chromium

# playwright installs a lot of apt packages to support its browser
RUN --mount=type=cache,target=/root/.cache \
    --mount=type=cache,target=/var/lib/apt \
    --mount=type=cache,target=/var/cache/apt \
    DEBIAN_FRONTEND=noninteractive poetry run playwright install-deps

# Apply security updates (e.g. GnuPG CVE-2025-68973, libtiff CVE-2025-9900); drop build-only headers
# (linux-libc-dev); remove GStreamer "bad" codecs not required for headless map export.
RUN --mount=type=cache,target=/var/lib/apt \
    --mount=type=cache,target=/var/cache/apt \
    DEBIAN_FRONTEND=noninteractive apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get -y upgrade && \
    DEBIAN_FRONTEND=noninteractive apt-get purge -y \
      build-essential python3-dev linux-libc-dev libpq-dev \
      gstreamer1.0-plugins-bad libgstreamer-plugins-bad1.0-0 && \
    DEBIAN_FRONTEND=noninteractive apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# keep this copy towards the end to help with caching previous layers
COPY ./prism_app /prism_app
COPY ./alembic.ini /alembic.ini
COPY ./alembic /alembic

WORKDIR /prism_app/

EXPOSE 80
