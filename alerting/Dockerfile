FROM node:16

COPY ./alerting /app

COPY ./common /common

WORKDIR /app

RUN yarn --frozen-lockfile

RUN yarn setup:common
