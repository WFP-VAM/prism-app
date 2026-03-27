#!/usr/bin/env bash
#
# Push a local dashboard.json to S3 as the canonical latest, after archiving
# any existing object as dashboard_MMDDYY.json (same-folder version history).
#
# Prerequisites: aws CLI v2, configured credentials (env, profile, or SSO).
# See this guide to set up AWS CLI and credentials: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html#sso-configure-profile-token-auto-sso
#
# Usage:
#   ./push-dashboard-config.sh [--profile <name>] [--dev] <country> <path-to-dashboard.json>
#
# Examples:
#   ./push-dashboard-config.sh mozambique ./my-dashboard.json
#   ./push-dashboard-config.sh --dev mozambique ./my-dashboard.json
#   ./push-dashboard-config.sh --profile wfp nepal ~/configs/nepal-dashboard.json
#   AWS_PROFILE=wfp ./push-dashboard-config.sh nepal ~/configs/nepal-dashboard.json
#
# Environment (optional):
#   DASHBOARD_S3_BUCKET      — default: prism-dashboard-config (production)
#   DASHBOARD_S3_DEV_BUCKET  — default: prism-dashboard-config-dev (used with --dev)
#   AWS_REGION               — default: eu-west-1 (must match bucket region)
#   AWS_PROFILE              — when set and --profile is omitted, used instead of default wfp-admin
#

set -euo pipefail

BUCKET_PROD="${DASHBOARD_S3_BUCKET:-prism-dashboard-config}"
BUCKET_DEV="${DASHBOARD_S3_DEV_BUCKET:-prism-dashboard-config-dev}"
REGION="${AWS_REGION:-eu-west-1}"
export AWS_DEFAULT_REGION="$REGION"

BUCKET="$BUCKET_PROD"

usage() {
  echo "Usage: $0 [--profile <name>] [--dev] <country> <path-to-local-dashboard.json>" >&2
  echo "  Archives existing s3://<bucket>/<country>/dashboard.json as dashboard_MMDDYY.json (or with time suffix if needed), then uploads the local file as dashboard.json." >&2
  echo "  --dev             use dev bucket ($BUCKET_DEV by default; override with DASHBOARD_S3_DEV_BUCKET)." >&2
  echo "  --profile <name>  passed to aws CLI (optional; default: \$AWS_PROFILE or wfp-admin)." >&2
  exit 1
}

AWS_PROFILE_ARGS=()
USE_DEV_BUCKET=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      if [[ $# -lt 2 || -z "$2" ]]; then
        echo "Error: --profile requires a non-empty profile name" >&2
        usage
      fi
      AWS_PROFILE_ARGS=(--profile "$2")
      shift 2
      ;;
    --dev)
      USE_DEV_BUCKET=1
      shift
      ;;
    -*)
      echo "Error: unknown option: $1" >&2
      usage
      ;;
    *)
      break
      ;;
  esac
done

if [[ "$USE_DEV_BUCKET" -eq 1 ]]; then
  BUCKET="$BUCKET_DEV"
fi

if [[ ${#AWS_PROFILE_ARGS[@]} -eq 0 ]]; then
  AWS_PROFILE_ARGS=(--profile "${AWS_PROFILE:-wfp-admin}")
fi

[[ $# -eq 2 ]] || usage

COUNTRY="$1"
LOCAL_FILE="$2"

if [[ ! -f "$LOCAL_FILE" ]]; then
  echo "Error: file not found: $LOCAL_FILE" >&2
  exit 1
fi

if [[ "$COUNTRY" == *"/"* || "$COUNTRY" == *".."* ]]; then
  echo "Error: invalid country key: $COUNTRY" >&2
  exit 1
fi

SOURCE_URI="s3://$BUCKET/$COUNTRY/dashboard.json"
DEST_KEY_PREFIX="$COUNTRY/dashboard"

echo "Bucket: s3://$BUCKET (region: $REGION)"
echo "AWS CLI profile: ${AWS_PROFILE_ARGS[1]}"
aws "${AWS_PROFILE_ARGS[@]}" sts get-caller-identity --output table
echo ""

# Archive current dashboard.json if it exists (copy to dated name, then remove original key before upload).
if aws "${AWS_PROFILE_ARGS[@]}" s3api head-object --bucket "$BUCKET" --key "$DEST_KEY_PREFIX.json" --region "$REGION" &>/dev/null; then
  STAMP="$(date +%m%d%y)"
  ARCHIVE_KEY="${DEST_KEY_PREFIX}_${STAMP}.json"
  if aws "${AWS_PROFILE_ARGS[@]}" s3api head-object --bucket "$BUCKET" --key "$ARCHIVE_KEY" --region "$REGION" &>/dev/null; then
    ARCHIVE_KEY="${DEST_KEY_PREFIX}_${STAMP}_$(date +%H%M%S).json"
    echo "Note: dated archive already exists for today; using $ARCHIVE_KEY"
  fi

  echo "Archiving current s3 object to $ARCHIVE_KEY ..."
  aws "${AWS_PROFILE_ARGS[@]}" s3 mv "$SOURCE_URI" "s3://$BUCKET/$ARCHIVE_KEY" --region "$REGION"
  echo "Archived as s3://$BUCKET/$ARCHIVE_KEY"
else
  echo "No existing s3://$BUCKET/$DEST_KEY_PREFIX.json — skipping archive."
fi

echo "Uploading $LOCAL_FILE -> $SOURCE_URI"
aws "${AWS_PROFILE_ARGS[@]}" s3 cp "$LOCAL_FILE" "$SOURCE_URI" --region "$REGION" \
  --content-type "application/json" \
  --cache-control "max-age=60"

echo ""
echo "Done. Latest config: $SOURCE_URI"
