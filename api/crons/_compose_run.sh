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

docker compose run --rm --no-deps \
  -e POSTGRES_SSL=true \
  export_map_worker \
  "$@" \
  2>&1 | tee -a "${API_ROOT}/${LOG_BASENAME}.log"
