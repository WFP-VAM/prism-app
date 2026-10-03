#!/usr/bin/env bash
# Staging overrides for the shared EC2. Source this, then call staging_apply_overrides.
# Caller must already have sourced set_envs.sh so the prod alerts DB URL is in the environment.
# Prod crons must not source this. make deploy-staging and PRISM_STAGING=1 crons do.

# shellcheck shell=bash

STAGING_ALERTS_DATABASE_URL='postgresql://postgres:!ChangeMe!@db:5432/postgres'
STAGING_HOSTNAME='prism-api-staging.ovio.org'
STAGING_EXPORT_MAP_S3_BUCKET='s3://prism-wfp/batch-maps-staging'

staging_db_host() {
  local url="$1"
  local rest hostport
  rest="${url#*@}"
  if [[ "$rest" == "$url" ]]; then
    printf ''
    return
  fi
  hostport="${rest%%/*}"
  printf '%s' "${hostport%%:*}"
}

# Refuse to start when the URL still matches prod or does not target the compose db service.
staging_assert_db_isolated() {
  local prod_url="$1"
  local staging_url="$2"
  local host
  host="$(staging_db_host "$staging_url")"
  if [[ -z "$prod_url" ]]; then
    echo "error: prod PRISM_ALERTS_DATABASE_URL is empty; source set_envs.sh first" >&2
    return 1
  fi
  if [[ "$staging_url" == "$prod_url" ]]; then
    echo "error: staging alerts DB URL still matches prod; refusing to start" >&2
    return 1
  fi
  if [[ "$host" != "db" ]]; then
    echo "error: staging alerts DB host must be db, got '${host:-empty}'" >&2
    return 1
  fi
}

staging_apply_overrides() {
  local prod_url="${PRISM_ALERTS_DATABASE_URL:-}"

  export PRISM_STAGING=1
  export COMPOSE_PROJECT_NAME=prism-staging
  export COMPOSE_FILE='docker-compose.yml:docker-compose.staging.yml'
  export HOSTNAME="$STAGING_HOSTNAME"
  export HEALTHCHECK_PUBLIC_HOST="$STAGING_HOSTNAME"
  export HEALTHCHECK_IN_CONTAINER=1
  export HEALTHCHECK_SKIP_TRAEFIK=1
  export WORKER_REPLICAS=1
  export PRISM_OIDC_REDIRECT_URI="https://${STAGING_HOSTNAME}/auth/callback"
  export EXPORT_MAP_S3_BUCKET="$STAGING_EXPORT_MAP_S3_BUCKET"
  export API_URL="https://${STAGING_HOSTNAME}"
  export MAIL_SUBJECT_PREFIX='[STAGING] '
  export PRISM_ALERTS_DATABASE_URL="$STAGING_ALERTS_DATABASE_URL"
  # PRISM_ENV stays production so scheduled map-export mail still sends.

  staging_assert_db_isolated "$prod_url" "$PRISM_ALERTS_DATABASE_URL"
}
