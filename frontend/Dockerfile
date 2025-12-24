# A small image around the frontend code
# that makes it easier to run python tests
# against the frontend using playwright
FROM node:20

# Update and upgrade system packages
RUN --mount=type=cache,target=/var/cache/apt \
    apt-get update && \
    apt-get upgrade -y && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# copy dependencies definitions for better caching
WORKDIR /common/

COPY ./common ./

WORKDIR /frontend/
COPY frontend/package.json ./

COPY frontend/yarn.lock ./

RUN yarn install --frozen-lockfile && yarn setup:common
RUN yarn global add cross-env

# copy the rest of the source code
COPY ./frontend .

EXPOSE 3000
