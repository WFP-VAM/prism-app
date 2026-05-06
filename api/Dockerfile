# ubuntu-small: core GDAL + deps; ~much smaller than ubuntu-full (extra drivers/HDF/etc.).
# If a raster format fails at runtime, switch back to ubuntu-full or add that driver.
FROM ghcr.io/osgeo/gdal:ubuntu-small-3.12.4
# Ubuntu 24.04, Python 3.12, GDAL 3.12.x

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

# GDAL images may ship Apache Arrow apt repo; drop if present (not needed for pip stack).
RUN rm -f /etc/apt/sources.list.d/apache-arrow.sources /etc/apt/sources.list.d/apache-arrow.list

# apt verifies InRelease via gpgv as user _apt; Docker Desktop (arm64) often breaks that sandbox and
# you get bogus GPG errors for *all* ubuntu-ports URLs. Run the apt sandbox as root during build.
RUN printf '%s\n' 'APT::Sandbox::User "root";' >/etc/apt/apt.conf.d/99docker-sandbox-root.conf

RUN --mount=type=cache,target=/var/cache/apt \
    DEBIAN_FRONTEND=noninteractive apt-get update --fix-missing && \
    DEBIAN_FRONTEND=noninteractive apt-get --no-install-recommends install -y python3-pip libpq-dev curl python3-dev build-essential

RUN DEBIAN_FRONTEND=noninteractive apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN --mount=type=cache,target=/root/.cache \
    poetry install

# Upgrade pip in the venv to address CVE-2026-1703 (pip 25.3 → 26.0)
RUN poetry run pip install --upgrade 'pip>=26.0'

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
