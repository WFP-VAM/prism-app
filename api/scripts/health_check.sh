#!/usr/bin/env bash
# Post-deploy health checks for the api stack (traefik, api, export_map_worker).
#
#   make -C api health
#   # or: ./scripts/health_check.sh
#
# Set HEALTHCHECK_STRICT=1 to exit non-zero when any required check fails.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# docker-compose.deploy.yml uses ${VAR:?} substitutions. Load them if missing
# (make health / make deploy source set_envs.sh first; this covers direct invocation).
if [[ -z "${INFO_EMAIL:-}" && -f "${ROOT}/set_envs.sh" ]]; then
  # shellcheck disable=SC1091
  source "${ROOT}/set_envs.sh"
fi

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.deploy.yml"
LOG_FILE="${ROOT}/logs/health.log"
WORKER_REPLICAS="${WORKER_REPLICAS:-2}"
API_URL="${HEALTHCHECK_API_URL:-http://localhost:80/}"
API_RETRIES="${HEALTHCHECK_API_RETRIES:-5}"
API_RETRY_INTERVAL="${HEALTHCHECK_API_RETRY_INTERVAL:-3}"
# Do not fall back to OS HOSTNAME (often an EC2 internal name).
PUBLIC_HOST="${HEALTHCHECK_PUBLIC_HOST:-}"

mkdir -p "${ROOT}/logs"

healthy=0
total=0
failed=0

log() {
  local line
  line="$(date -u +"%Y-%m-%dT%H:%M:%SZ") $*"
  echo "$line"
  echo "$line" >> "$LOG_FILE"
}

record_pass() {
  healthy=$((healthy + 1))
  total=$((total + 1))
}

record_fail() {
  total=$((total + 1))
  failed=$((failed + 1))
}

check_api_local() {
  local attempt body
  for attempt in $(seq 1 "$API_RETRIES"); do
    if body="$(curl -sf --max-time 5 "$API_URL" 2>/dev/null)" && [[ "$body" == *"All good!"* ]]; then
      log "✅ [api] OK (http 200, attempt ${attempt}/${API_RETRIES})"
      record_pass
      return 0
    fi
    if [[ "$attempt" -lt "$API_RETRIES" ]]; then
      sleep "$API_RETRY_INTERVAL"
    fi
  done
  log "❌ [api] FAIL (no response from ${API_URL} after ${API_RETRIES} attempts)"
  record_fail
  return 1
}

check_api_public() {
  local url body
  if [[ -z "$PUBLIC_HOST" ]]; then
    log "⏭️  [api-public] SKIP (HEALTHCHECK_PUBLIC_HOST not set)"
    return 0
  fi

  url="https://${PUBLIC_HOST}/"
  if body="$(curl -sf --max-time 10 "$url" 2>/dev/null)" && [[ "$body" == *"All good!"* ]]; then
    log "✅ [api-public] OK (${url})"
    return 0
  fi
  log "⚠️  [api-public] WARN (could not reach ${url}; local api check is authoritative)"
  return 0
}

check_traefik() {
  local container_id
  container_id="$($COMPOSE ps --status running -q traefik 2>/dev/null | head -n 1 || true)"
  if [[ -n "$container_id" ]]; then
    log "✅ [traefik] OK (container running)"
    record_pass
    return 0
  fi
  log "❌ [traefik] FAIL (no running container)"
  record_fail
  return 1
}

check_export_map_worker() {
  local count
  count="$($COMPOSE ps --status running -q export_map_worker 2>/dev/null | wc -l | tr -d ' ' || true)"
  count="${count:-0}"
  if [[ "$count" -ge "$WORKER_REPLICAS" ]]; then
    log "✅ [export_map_worker] OK (${count}/${WORKER_REPLICAS} replicas running)"
    record_pass
    return 0
  fi
  log "❌ [export_map_worker] FAIL (${count}/${WORKER_REPLICAS} replicas running)"
  record_fail
  return 1
}

main() {
  log "=== deploy health check ==="

  check_api_local || true
  check_api_public || true
  check_traefik || true
  check_export_map_worker || true

  if [[ "$failed" -eq 0 ]]; then
    log "✅ SUMMARY: ${healthy}/${total} healthy"
  else
    log "❌ SUMMARY: ${healthy}/${total} healthy"
    echo "💡 To roll back to the previous deploy: ./crons/rollback_api_to_prev.sh"
  fi

  if [[ "$failed" -gt 0 ]]; then
    if [[ "${HEALTHCHECK_STRICT:-}" == "1" ]]; then
      exit 1
    fi
  fi
}

main "$@"
