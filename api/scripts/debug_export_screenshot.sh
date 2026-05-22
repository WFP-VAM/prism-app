#!/usr/bin/env bash
# Capture /export via export_map_worker Docker (same Playwright as batch maps).
#
# Prerequisites:
#   1. Frontend: cd frontend && REACT_APP_COUNTRY=cambodia yarn start
#   2. From api/: docker compose build export_map_worker  (first time)
#
# Usage:
#   ./scripts/debug_export_screenshot.sh
#   ./scripts/debug_export_screenshot.sh 'http://host.docker.internal:3000/export?...'
#   ./scripts/debug_export_screenshot.sh 'http://host.docker.internal:3000/export?...' ./cache/out.png
#
set -euo pipefail
cd "$(dirname "$0")/.."

DEFAULT_QUERY="hazardLayerIds=rainfall_dekad&date=2026-05-10&language=kh&legendVisibility=true&footerVisibility=true&title=Font%20test"
DEFAULT_URL="http://host.docker.internal:3000/export?${DEFAULT_QUERY}"

URL="${1:-$DEFAULT_URL}"
OUT="${2:-./cache/debug-export.png}"
OUT_NAME="$(basename "$OUT")"

mkdir -p cache

LOCAL_CHECK="${URL/host.docker.internal/localhost}"
LOCAL_CHECK="${LOCAL_CHECK/127.0.0.1/localhost}"
if ! curl -sf -o /dev/null -m 5 "${LOCAL_CHECK}" 2>/dev/null; then
  echo "WARN: frontend not responding at ${LOCAL_CHECK}" >&2
  echo "      Start: cd frontend && REACT_APP_COUNTRY=cambodia yarn start" >&2
fi

docker compose run --rm \
  export_map_worker \
  python -m prism_app.debug_export_screenshot \
    --url "$URL" \
    --output "/cache/${OUT_NAME}" \
    --fonts-json "/cache/${OUT_NAME%.png}-fonts.json" \
    --docker

echo ""
echo "Open ${OUT} to inspect glyphs."
echo "Font diagnostics: ${OUT%.png}-fonts.json"
