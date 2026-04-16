#!/usr/bin/env bash
set -euo pipefail

# To set up cron on EC2:
# crontab -e
# Example (daily at 01:00, log to file):
# 0 1 * * * APP_DIR="$HOME/prism-app/api" BRANCH=main HEALTHCHECK_URL="http://127.0.0.1/health" $HOME/prism-app/api/crons/cron_api_auto_deploy.sh >> $HOME/prism-app/api/auto_deploy.log 2>&1
# Note: script no-ops if target branch SHA unchanged since last successful deploy.
#
# Auto-deploy API on EC2 when main/master advances.
# Designed for cron usage: idempotent, locked, SHA-pinned, with optional healthcheck gate.

APP_DIR="${APP_DIR:-$HOME/prism-app/api}"
BRANCH="${BRANCH:-master}"
STATE_DIR="${STATE_DIR:-/var/lib/prism-api-deployer}"
LOCK_FILE="${LOCK_FILE:-/var/lock/prism-api-auto-deploy.lock}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-}"

mkdir -p "$STATE_DIR"

run_deploy() {
  cd "$APP_DIR"

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

  if [[ -n "$HEALTHCHECK_URL" ]]; then
    curl -fsS --max-time 10 "$HEALTHCHECK_URL" >/dev/null
  fi

  echo "$target_sha" > "$STATE_DIR/deployed_sha"
  echo "deployed: $target_sha (prev: $prev_sha)"
}

if command -v flock >/dev/null 2>&1; then
  flock -n "$LOCK_FILE" bash -c "$(declare -f run_deploy); run_deploy"
else
  # Fallback (best-effort) if flock not installed
  if [[ -e "$LOCK_FILE" ]]; then
    echo "lock exists: $LOCK_FILE"
    exit 1
  fi
  trap 'rm -f "$LOCK_FILE"' EXIT
  : > "$LOCK_FILE"
  run_deploy
fi

