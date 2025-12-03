FROM --platform=linux/amd64 node:20

ARG CHROME_VERSION

COPY ./alerting /prism_app
COPY ./common /common

# Install dependencies and Chrome for puppeteer
RUN set -e && \
    apt-get update && apt-get install -y \
    libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libxcomposite1 libxdamage1 libgbm1 libxkbcommon-x11-0 \
    libasound2 libxfixes3 libxrandr2 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN npx @puppeteer/browsers install chrome@$CHROME_VERSION && \
    npx @puppeteer/browsers install chromedriver@$CHROME_VERSION

WORKDIR /common
RUN yarn --frozen-lockfile --production=false

WORKDIR /prism_app
RUN yarn --frozen-lockfile --production=false
RUN yarn setup:common
