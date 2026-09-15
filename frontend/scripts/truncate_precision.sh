#!/bin/bash -e

echo "running truncate_precision.sh"

decimal_places=6 # Set the desired number of decimal places

# Resolve frontend/ from this script's location so cwd does not matter
scriptdir="$(cd "$(dirname "$0")" && pwd)"
rootdir="$(cd "$scriptdir/.." && pwd)"

shopt -s nullglob
for file in "$rootdir"/public/data/*/*.json "$rootdir"/public/data/*/*.geojson; do
  echo "updating $file"
  sed -i.bak -E "s/([0-9]+\\.[0-9]{$decimal_places})([0-9]+)/\\1/g" "$file"
done

# delete all backup files
rm -f "$rootdir"/public/data/*/*.json.bak "$rootdir"/public/data/*/*.geojson.bak
