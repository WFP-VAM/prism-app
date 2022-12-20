#!/bin/bash -e

echo "running truncate_precision.sh"

# assumes you are running truncate_precision from within the prism-app project
# removes scripts from the filepath, moving up one directory to the root
rootdir=$(pwd | sed 's/\/scripts//g')

for file in $rootdir/public/data/*/*.json; do
  echo "updating $file"
  sed -i.bak -E 's/([0-9]+\.[0-9]{9})([0-9]+)/\1/g' $file;
done

# delete all backup files
rm -f $rootdir/public/data/*/*.json.bak
