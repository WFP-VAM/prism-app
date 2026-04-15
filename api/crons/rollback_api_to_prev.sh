#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/prism-app/api}"
STATE_DIR="${STATE_DIR:-/var/lib/prism-api-deployer}"

if [[ ! -f "$STATE_DIR/prev_sha" ]]; then
  echo "missing $STATE_DIR/prev_sha (no previous deploy recorded)"
  exit 1
fi

cd "$APP_DIR"
target_sha="$(cat "$STATE_DIR/prev_sha")"

git fetch --prune origin
git checkout --detach "$target_sha"

# shellcheck disable=SC1091
source ./set_envs.sh
make deploy

echo "rolled back to: $target_sha"

