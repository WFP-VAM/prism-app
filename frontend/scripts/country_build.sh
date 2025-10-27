#!/bin/bash -e

# Multi-purpose country build script
# Supports: build (zip files) and deploy (firebase preview channels)
# Usage: ./country_build.sh [build|deploy]

MODE=${1:-"build"}

# Validate mode
if [[ ! "$MODE" =~ ^(build|deploy)$ ]]; then
  echo "Error: Mode must be 'build' or 'deploy'"
  echo "Usage: $0 [build|deploy]"
  exit 1
fi

# Extract valid countries dynamically from config directories
extract_countries() {
  # Use ls to list directories in src/config/ and filter out non-country entries
  for dir in src/config/*/; do
    local name=$(basename "$dir")
    # Skip non-country directories
    case "$name" in
      shared) continue ;;
    esac
    echo "$name"
  done | sort
}

VALID_COUNTRIES=($(extract_countries))

# Check if we got any countries
if [ ${#VALID_COUNTRIES[@]} -eq 0 ]; then
  echo "Error: Could not extract countries from config directories" >&2
  echo "Please ensure src/config/ contains country directories" >&2
  exit 1
fi

# Debug: Show how many countries were found (uncomment for debugging)
# echo "Found ${#VALID_COUNTRIES[@]} valid countries" >&2

# Function to validate a country name - exact match only
validate_country() {
  local country="$1"
  
  # Check for "all" or "all countries"
  if [[ "$country" =~ ^(all|all countries)$ ]]; then
    return 0
  fi
  
  # Check exact match only
  for valid in "${VALID_COUNTRIES[@]}"; do
    if [[ "$country" == "$valid" ]]; then
      return 0
    fi
  done
  
  # No match found
  return 1
}

# Read the space-separated list of countries
echo "Enter a space-separated list of countries (or 'all' to build all countries):"
read input_countries

# Replace commas with spaces and trim
countries=$(echo "$input_countries" | tr ',' ' ')

# Replace double spaces with a single space
countries=$(echo "$countries" | sed 's/  / /g')

# Convert to lowercase
countries=$(echo "$countries" | tr '[:upper:]' '[:lower:]')

# Trim leading and trailing whitespace
countries=$(echo "$countries" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

# Convert the string to an array
read -a countries <<< "$countries"

# Check if any countries were provided
if [ ${#countries[@]} -eq 0 ]; then
  echo "Error: No countries provided"
  exit 1
fi

# Validate countries and expand "all" if present
validated_countries=()
has_all=false

for country in "${countries[@]}"; do
  # Trim whitespace from country name
  country=$(echo "$country" | xargs)
  
  # Skip empty entries
  if [ -z "$country" ]; then
    continue
  fi
  
  # Validate country (exact match only)
  if ! validate_country "$country"; then
    echo "Error: Invalid country name '$country'" >&2
    echo "" >&2
    echo "Available countries:" >&2
    for valid in "${VALID_COUNTRIES[@]}"; do
      echo "  - $valid" >&2
    done
    echo "" >&2
    echo "You can also enter 'all' to build all countries." >&2
    exit 1
  fi
  
  # Add to validated list or set all flag
  if [[ "$country" =~ ^(all|all countries)$ ]]; then
    has_all=true
  else
    validated_countries+=("$country")
  fi
done

# If "all" was specified, replace with all countries
if [ "$has_all" = true ]; then
  if [ ${#validated_countries[@]} -gt 0 ]; then
    echo "Warning: 'all' was specified with other countries. Using only 'all'."
  fi
  countries=("${VALID_COUNTRIES[@]}")
else
  countries=("${validated_countries[@]}")
fi

# Final check
if [ ${#countries[@]} -eq 0 ]; then
  echo "Error: No valid countries to process"
  exit 1
fi

# Display the list of countries that will be processed
echo ""
echo "============================================"
echo "Countries to process (${#countries[@]}):"
echo "============================================"
for country in "${countries[@]}"; do
  echo "  - $country"
done
echo "============================================"
echo ""

# Deploy-specific: read optional prefix
if [ "$MODE" = "deploy" ]; then
  echo "Enter an optional prefix for the domain (leave empty for no prefix):"
  read prefix
  
  # Add a dash to the prefix if it's not empty
  if [[ ! -z "$prefix" ]]; then
    prefix="${prefix}-"
  fi
fi

# Create builds directory if building
if [ "$MODE" = "build" ]; then
  mkdir -p builds
fi

# Counter for successful operations
success_count=0
failed_count=0

# Loop over the countries
for country in "${countries[@]}"
do
  echo ""
  echo "============================================"
  echo "Processing: $country"
  echo "============================================"
  
  # Check if build directory exists
  if [ -d "build" ]; then
    rm -rf build
  fi
  
  # Build the app with the country as a parameter
  if REACT_APP_COUNTRY=$country yarn build; then
    # Check if build was successful (build directory exists)
    if [ -d "build" ]; then
      
      if [ "$MODE" = "build" ]; then
        # Build mode: create zip file
        zip_file="builds/${country}.zip"
        echo "Creating zip file: $zip_file"
        
        cd build && zip -r "../${zip_file}" . && cd ..
        
        if [ -f "$zip_file" ]; then
          echo "Successfully created $zip_file"
          ((success_count++))
        else
          echo "Error: Failed to create zip file for $country"
          ((failed_count++))
        fi
        
        # Clean up build directory
        rm -rf build
        
      elif [ "$MODE" = "deploy" ]; then
        # Deploy mode: deploy to Firebase preview channel
        echo "Deploying app for $country..."
        CHANNEL_ID="${prefix}${country}"
        
        if firebase hosting:channel:deploy $CHANNEL_ID --project prism-frontend --only prod-target --expires 7d; then
          echo "Deployed $country to preview channel: $CHANNEL_ID"
          ((success_count++))
        else
          echo "Error: Deployment failed for $country"
          ((failed_count++))
        fi
        
        # Keep build directory for potential troubleshooting
        # rm -rf build
      fi
      
    else
      echo "Error: Build directory not found for $country"
      ((failed_count++))
    fi
  else
    echo "Error: Build failed for $country"
    ((failed_count++))
  fi
done

# Summary
echo "============================================"
if [ "$MODE" = "build" ]; then
  echo "Batch build complete!"
else
  echo "All deployments complete. Preview links expire in 7 days."
fi
echo "  Successfully processed: $success_count"
if [ $failed_count -gt 0 ]; then
  echo "  Failed: $failed_count"
fi
echo "============================================"

# Exit with error if any operations failed
if [ $failed_count -gt 0 ]; then
  exit 1
fi
