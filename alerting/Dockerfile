FROM node:16

COPY ./alerting /app

COPY ./common /common

WORKDIR /app

RUN yarn

RUN yarn setup:common
