# A small image around the frontend code
# that makes it easier to run python tests
# against the frontend using playwright
FROM node:16-bookworm

# copy dependencies definitions for better caching
WORKDIR /common/

COPY ./common ./

WORKDIR /frontend/
COPY frontend/package.json ./

COPY frontend/yarn.lock ./

RUN yarn install --frozen-lockfile && yarn setup:common

# copy the rest of the source code
COPY ./frontend .

RUN GENERATE_SOURCEMAP=true REACT_APP_COUNTRY=cambodia yarn build

EXPOSE 3000
