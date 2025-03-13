#!/bin/bash -e

# Read the space-separated list of countries
echo "Enter a space-separated list of countries:"
read input_countries

# Replace commas with spaces
countries=$(echo $input_countries | tr ',' ' ')

# Replace double spaces with a single space
countries=$(echo $countries | sed 's/  / /g')

# Convert the string to an array
read -a countries <<< $countries

# Read the optional prefix
echo "Enter an optional prefix for the domain (leave empty for no prefix):"
read prefix

# Add a dash to the prefix if it's not empty
if [[ ! -z "$prefix" ]]; then
  prefix="${prefix}-"
fi

# Loop over the countries
for country in "${countries[@]}"
do
  # Build the app with the country as a parameter
  echo "Building app for $country..."
  REACT_APP_COUNTRY=$country yarn build

  # Deploy the app using surge
  echo "Deploying app for $country..."
  # Define a unique preview channel ID for each country
  CHANNEL_ID="${prefix}${country}"

  # Firebase Preview channel deploy command
  firebase hosting:channel:deploy $CHANNEL_ID --project prism-frontend --only prod-target --expires 7d

  echo "Deployed $country to preview channel. This link will expire in 7 days."
done

echo "All deployments complete. Remember that all preview links will expire in 7 days."
