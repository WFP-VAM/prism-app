#!/opt/homebrew/bin/bash
# =============================================================================
# deploy_prism_demo.sh
# Deploy PRISM to a PERMANENT Firebase Hosting site (never expires).
#
# Unlike Firebase preview channels (capped at 30 days, see country_build.sh),
# a hosting site produces a durable link: https://<site-id>.web.app
#
# Usage:
#   ./deploy_prism_demo.sh --country <key> [--site <site-id>]
#
# Requirements:
#   - firebase-tools, authenticated (firebase login)
#   - yarn, jq installed (brew install jq)
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BUILD_DIR="${FRONTEND_DIR}/build"
CONFIG_DIR="${FRONTEND_DIR}/src/config"

# ── Defaults ──────────────────────────────────────────────────────────────────
COUNTRY=""
SITE_ID=""
PROJECT="prism-frontend"
SKIP_BUILD=false

# ── Country discovery (mirrors country_build.sh) ───────────────────────────────
list_countries() {
  echo -e "${BOLD}Available countries:${RESET}"
  for dir in "${CONFIG_DIR}"/*/; do
    local name; name="$(basename "$dir")"
    [[ "$name" == "shared" ]] && continue
    echo "  - $name"
  done | sort
}

is_valid_country() {
  local country="$1"
  [[ -d "${CONFIG_DIR}/${country}" && "$country" != "shared" ]]
}

usage() {
  echo -e "${BOLD}Usage:${RESET} $0 --country <key> [options]"
  echo ""
  echo "Deploys PRISM to a permanent Firebase Hosting site (never expires)."
  echo ""
  echo "Options:"
  echo "  --country         Country config key (see --list-countries)   [required]"
  echo "  --site            Firebase site id (default: prism-demo-<country>)"
  echo "  --project         Firebase project (default: prism-frontend)"
  echo "  --skip-build      Reuse existing build/ dir, skip yarn build"
  echo "  --list-countries  Show all available country config keys"
  echo "  --help            Show this message"
  echo ""
  echo "Note: Firebase site ids must be globally unique, lowercase,"
  echo "      alphanumeric + hyphens, and <= 30 characters."
  exit 0
}

# ── Arg parsing ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --country)        COUNTRY="${2,,}"; shift 2 ;;
    --site)           SITE_ID="${2,,}"; shift 2 ;;
    --project)        PROJECT="$2";     shift 2 ;;
    --skip-build)     SKIP_BUILD=true;  shift   ;;
    --list-countries) list_countries;   exit 0  ;;
    --help|-h)        usage ;;
    *) error "Unknown argument: $1. Run with --help for usage." ;;
  esac
done

[[ -z "$COUNTRY" ]] && error "--country is required. Run with --list-countries to see options."

if ! is_valid_country "$COUNTRY"; then
  echo "" >&2
  list_countries >&2
  error "Unknown country '${COUNTRY}'."
fi

# Default site id derived from country; validate the final value.
[[ -z "$SITE_ID" ]] && SITE_ID="prism-demo-${COUNTRY}"

if [[ ! "$SITE_ID" =~ ^[a-z0-9-]+$ ]]; then
  error "Invalid site id '${SITE_ID}'. Use only lowercase letters, digits, and hyphens."
fi
if [[ "${#SITE_ID}" -gt 30 ]]; then
  error "Site id '${SITE_ID}' is ${#SITE_ID} chars; Firebase allows max 30. Pass a shorter --site."
fi

DEMO_URL="https://${SITE_ID}.web.app"

# ── Confirmation ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}────────────────────────────────────────────────────────${RESET}"
echo -e "  ${BOLD}Permanent demo deployment${RESET}"
echo -e "  Country  : ${CYAN}${COUNTRY}${RESET}"
echo -e "  Project  : ${CYAN}${PROJECT}${RESET}"
echo -e "  Site id  : ${CYAN}${SITE_ID}${RESET}"
echo -e "  URL      : ${CYAN}${DEMO_URL}${RESET}"
echo -e "  Expiry   : ${GREEN}never${RESET}"
echo -e "${BOLD}────────────────────────────────────────────────────────${RESET}"
echo ""
read -rp "$(echo -e "${YELLOW}Deploy to this site? Type 'yes' to confirm: ${RESET}")" CONFIRM
[[ "${CONFIRM,,}" != "yes" ]] && { warn "Deployment cancelled."; exit 0; }
echo ""

# ── Check Firebase auth ──────────────────────────────────────────────────────────
info "Verifying Firebase authentication..."
# login:list only proves an account is remembered, not that its token is valid.
# Hit the API (projects:list) to catch stale/expired credentials up front.
if ! firebase projects:list --project "$PROJECT" >/dev/null 2>&1; then
  error "Firebase auth failed (missing, expired, or unauthorized credentials).
  Re-authenticate with:  firebase login --reauth
  Then confirm access to project '${PROJECT}' with:  firebase projects:list"
fi
success "Firebase auth OK."

# ── Build ────────────────────────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == false ]]; then
  info "Running yarn build for country '${COUNTRY}'..."
  (cd "$FRONTEND_DIR" && REACT_APP_COUNTRY="${COUNTRY}" yarn build) \
    || error "yarn build failed."
  success "Build complete."
else
  warn "--skip-build: using existing '${BUILD_DIR}' directory."
fi

[[ ! -d "$BUILD_DIR" ]] && error "Build directory '${BUILD_DIR}' not found."

# ── Ensure the hosting site exists ────────────────────────────────────────────────
info "Checking whether hosting site '${SITE_ID}' exists..."
SITES_JSON="$(firebase hosting:sites:list --project "$PROJECT" --json 2>/dev/null || true)"
if [[ "$(echo "$SITES_JSON" | jq -r '.status // "error"')" != "success" ]]; then
  error "Could not list hosting sites for project '${PROJECT}':
  $(echo "$SITES_JSON" | jq -r '.error // "unknown error"')"
fi
EXISTING_SITES="$(echo "$SITES_JSON" | jq -r '.result.sites[]?.name // empty')"

if echo "$EXISTING_SITES" | grep -q "/sites/${SITE_ID}$"; then
  success "Site '${SITE_ID}' already exists — redeploying."
else
  info "Site '${SITE_ID}' not found — creating it..."
  firebase hosting:sites:create "$SITE_ID" --project "$PROJECT" \
    || error "Failed to create site '${SITE_ID}'. It may already be taken by another Firebase project (site ids are globally unique). Try a different --site."
  success "Site '${SITE_ID}' created."
fi

# ── Deploy via a temporary config (leaves firebase.json / .firebaserc untouched) ──
# Firebase resolves "public" relative to the config file's directory, so the
# temp config must live in FRONTEND_DIR for "public": "build" to resolve.
TMP_CONFIG="$(mktemp "${FRONTEND_DIR}/.prism-demo-firebase-XXXXXX.json")"
trap 'rm -f "$TMP_CONFIG"' EXIT

cat > "$TMP_CONFIG" <<EOF
{
  "hosting": {
    "site": "${SITE_ID}",
    "public": "build",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
EOF

info "Deploying to permanent site '${SITE_ID}'..."
(cd "$FRONTEND_DIR" && firebase deploy \
    --only hosting \
    --project "$PROJECT" \
    --config "$TMP_CONFIG" \
    --non-interactive) \
  || error "Firebase deploy failed."

echo ""
success "Deployment SUCCEEDED ✓"
echo -e "  Permanent URL: ${CYAN}${DEMO_URL}${RESET}"
echo -e "  (also reachable at https://${SITE_ID}.firebaseapp.com)"
echo ""
info "This link does not expire. Re-run this script to push updates to the same URL."
echo ""
