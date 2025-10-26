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

# Read the space-separated list of countries
echo "Enter a space-separated list of countries:"
read input_countries

# Replace commas with spaces
countries=$(echo $input_countries | tr ',' ' ')

# Replace double spaces with a single space
countries=$(echo $countries | sed 's/  / /g')

# Convert the string to an array
read -a countries <<< $countries

# Check if any countries were provided
if [ ${#countries[@]} -eq 0 ]; then
  echo "Error: No countries provided"
  exit 1
fi

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
  echo "Building app for $country..."
  
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
  
  echo "Completed $country"
  echo ""
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
