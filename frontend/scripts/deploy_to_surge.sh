#!/bin/bash -e

# Read the space-separated list of countries
echo "Enter a space-separated list of countries:"
read -a countries

# Loop over the countries
for country in "${countries[@]}"
do
  # Build the app with the country as a parameter
  echo "Building app for $country..."
  REACT_APP_COUNTRY=$country yarn build

  # Deploy the app using surge
  echo "Deploying app for $country..."
  yarn surge --project ./build --domain prism-test-$country.surge.sh
done
