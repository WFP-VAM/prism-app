#!/usr/bin/env bash
# Point this repo's git hooks at .githooks/ (strips Cursor co-author trailers).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

chmod +x "${ROOT}/.githooks/"*.sh 2>/dev/null || true
chmod +x "${ROOT}/.githooks/prepare-commit-msg"

git -C "$ROOT" config core.hooksPath .githooks

echo "core.hooksPath set to .githooks for $(git -C "$ROOT" rev-parse --show-toplevel)"
