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
  yarn surge --project ./build --domain ${prefix}prism-test-$country.surge.sh
done
