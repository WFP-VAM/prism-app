FROM node:20

COPY ./alerting /app
COPY ./common /common

WORKDIR /common
RUN yarn --frozen-lockfile

WORKDIR /app
RUN yarn --frozen-lockfile
RUN yarn setup:common
