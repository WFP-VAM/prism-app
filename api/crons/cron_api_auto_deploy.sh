#!/usr/bin/env bash
set -euo pipefail

# To set up cron on EC2:
# crontab -e
# Example (daily at 01:00, log to file):
# 0 1 * * * BRANCH=master ~/prism-app/api/crons/cron_api_auto_deploy.sh >> ~/prism-app/api/auto_deploy.log 2>&1
# Note: script no-ops if target branch SHA unchanged since last successful deploy.
#
# Auto-deploy API on EC2 when main/master advances.
# Designed for cron usage: idempotent, locked, SHA-pinned, and gated on the
# full deploy health check (api + traefik + export_map_worker).

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
BRANCH="${BRANCH:-master}"
STATE_DIR="$API_DIR/.auto_deploy_state"
LOCK_FILE="$STATE_DIR/auto_deploy.lock"

export API_DIR BRANCH STATE_DIR LOCK_FILE

mkdir -p "$STATE_DIR"

run_deploy() {
  cd "$API_DIR"

  if [[ ! -f "./set_envs.sh" ]]; then
    echo "error: missing ./set_envs.sh in $API_DIR" >&2
    return 1
  fi

  if [[ ! -f "./Makefile" ]]; then
    echo "error: missing ./Makefile in $API_DIR" >&2
    return 1
  fi

  local current_branch
  current_branch="$(git branch --show-current || true)"
  if [[ -n "$current_branch" && "$current_branch" != "$BRANCH" ]]; then
    echo "error: current branch '$current_branch' != '$BRANCH'; refusing deploy" >&2
    return 1
  fi

  git fetch --prune origin "$BRANCH"
  local target_sha
  target_sha="$(git rev-parse "origin/$BRANCH")"

  local deployed_sha=""
  if [[ -f "$STATE_DIR/deployed_sha" ]]; then
    deployed_sha="$(cat "$STATE_DIR/deployed_sha" || true)"
  fi

  if [[ "$target_sha" == "$deployed_sha" ]]; then
    echo "noop: already deployed $target_sha"
    return 0
  fi

  local prev_sha
  prev_sha="$(git rev-parse HEAD)"
  echo "$prev_sha" > "$STATE_DIR/prev_sha"

  git checkout --detach "$target_sha"

  # PRISM uses secrets from AWS for deploy
  # shellcheck disable=SC1091
  source ./set_envs.sh
  make deploy

  # Gate the deploy on the full health check (api + traefik + export_map_worker).
  # HEALTHCHECK_STRICT=1 makes it exit non-zero if any required service is unhealthy,
  # so a partial deploy is not recorded and cron retries on the next run.
  if ! HEALTHCHECK_STRICT=1 ./scripts/health_check.sh; then
    echo "error: healthcheck failed" >&2
    return 1
  fi

  echo "$target_sha" > "$STATE_DIR/deployed_sha"
  echo "deployed: $target_sha (prev: $prev_sha)"
}

if ! command -v flock >/dev/null 2>&1; then
  echo "error: flock is required but not installed" >&2
  exit 1
fi
flock -n "$LOCK_FILE" bash -euo pipefail -c "$(declare -f run_deploy); run_deploy"

