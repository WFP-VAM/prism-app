#!/usr/bin/env bash
#
# Idempotently sets up an S3 bucket for PRISM dashboard JSON storage:
# - Creates the bucket (if it doesn't exist)
# - Creates a folder per country (using .keep placeholders)
# - Configures CORS so the PRISM React app can fetch JSON files
#
# Prerequisites: s5cmd, aws cli (for CORS - s5cmd does not support CORS)
# Usage: ./s3-prism-bucket-setup.sh
#
# CORS allowed origins can be customized via ALLOWED_ORIGINS env var
# (comma-separated, e.g. "https://prism.wfp.org,http://localhost:3000")
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_DIR="$PROJECT_ROOT/frontend/src/config"

# --- Config ---
BUCKET="prism-dashboard-config" # default bucket name
# CORS: S3 applies CORS at bucket level only (not per folder).
# One policy applies to all objects in the bucket, including country folders.
DEFAULT_ORIGINS="https://prism.wfp.org,http://localhost:3000,http://localhost"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-$DEFAULT_ORIGINS}"

# --- Extract countries from config (same logic as country_build.sh) ---
extract_countries() {
  for dir in "$CONFIG_DIR"/*/; do
    [[ -d "$dir" ]] || continue
    name=$(basename "$dir")
    case "$name" in
      shared) continue ;;
    esac
    echo "$name"
  done | sort
}

COUNTRIES=($(extract_countries))
if [[ ${#COUNTRIES[@]} -eq 0 ]]; then
  echo "Error: No countries found in $CONFIG_DIR" >&2
  exit 1
fi

echo "Countries to create folders for (${#COUNTRIES[@]}): ${COUNTRIES[*]}"
echo "Bucket: $BUCKET"
echo ""

# --- 1. Create bucket (idempotent) ---
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "Bucket s3://$BUCKET already exists, skipping creation."
else
  echo "Creating bucket s3://$BUCKET..."
  s5cmd mb "s3://$BUCKET" || {
    echo "Error: Failed to create bucket. Check s5cmd is installed and AWS credentials are configured." >&2
    exit 1
  }
  echo "Bucket created."
fi

# --- 2. Create country folders (idempotent) ---
# S3 has no real folders; we create them by uploading a placeholder object.
# Each country folder will implicitly exist when we put objects under that prefix.
# Using .keep ensures the folder exists and is idempotent on re-run.
EMPTY_FILE=$(mktemp)
trap "rm -f $EMPTY_FILE" EXIT
touch "$EMPTY_FILE"

echo "Creating country folders..."
for country in "${COUNTRIES[@]}"; do
  s5cmd cp "$EMPTY_FILE" "s3://$BUCKET/$country/.keep"
done
echo "Folders created for ${#COUNTRIES[@]} countries."

# --- 3. Configure CORS (bucket-level, applies to all objects including country folders) ---
# Build CORS JSON from ALLOWED_ORIGINS
IFS=',' read -ra ORIGINS <<< "$ALLOWED_ORIGINS"
ORIGINS_JSON="["
for i in "${!ORIGINS[@]}"; do
  origin=$(echo "${ORIGINS[$i]}" | xargs)
  [[ -n "$origin" ]] || continue
  [[ $i -gt 0 ]] && ORIGINS_JSON+=", "
  ORIGINS_JSON+="\"$origin\""
done
ORIGINS_JSON+="]"

CORS_JSON=$(cat <<EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": $ORIGINS_JSON,
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": []
    }
  ]
}
EOF
)

echo "Applying CORS policy to bucket..."
echo "$CORS_JSON" | aws s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration file:///dev/stdin
echo "CORS configured successfully."

echo ""
echo "Done. Bucket s3://$BUCKET is ready."
echo "  - Country folders: s3://$BUCKET/<country>/"
echo "  - Upload JSON files to e.g. s3://$BUCKET/mozambique/dashboards.json"
echo "  - CORS allows fetches from: $ALLOWED_ORIGINS"
