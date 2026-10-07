#!/usr/bin/env bash
# Run a one-shot command in export_map_worker (shared Playwright worker image).
# Usage: _compose_run.sh <log_basename> -- <command...>
set -euo pipefail

API_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$API_ROOT"

LOG_BASENAME="${1:?log basename required (without .log)}"
shift
if [[ "${1:-}" != "--" ]]; then
  echo "usage: _compose_run.sh <log_basename> -- <command...>" >&2
  exit 1
fi
shift

if [[ -f ./set_envs.sh ]]; then
  # shellcheck source=/dev/null
  source ./set_envs.sh
fi

# Opt-in only. Prod crons leave PRISM_STAGING unset so they keep the prod database.
if [[ "${PRISM_STAGING:-}" == "1" ]]; then
  # shellcheck source=../scripts/staging_env.sh
  source ./scripts/staging_env.sh
  staging_apply_overrides
fi

# Prod RDS requires TLS. The staging PostGIS container does not.
ssl_mode=true
if [[ "${PRISM_STAGING:-}" == "1" ]]; then
  ssl_mode=false
fi

docker compose run --rm --no-deps \
  -e "POSTGRES_SSL=${ssl_mode}" \
  export_map_worker \
  "$@" \
  2>&1 | tee -a "${API_ROOT}/${LOG_BASENAME}.log"
