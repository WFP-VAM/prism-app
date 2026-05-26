/**
 * This script checks that the keys listed in layers.json
 * actually exist in the corresponding boundary files.
 */
const fs = require('fs');
const path = require('path');

let missingKeys = false;

function checkKeysExistence(layer, filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  // Check if the keys exist in the JSON file
  const keysToCheck = [
    ...layer.admin_level_codes,
    ...layer.admin_level_names,
    ...layer.admin_level_local_names,
  ];

  keysToCheck.forEach(key => {
    if (!fileContent.includes(`"${key}":`)) {
      const relativePath = path.relative(__dirname, filePath);
      console.warn(`Key ${key} does not exist in file ${relativePath}`);
      missingKeys = true; // Set the flag to true if a key is missing
    }
  });
}

// Get all country directories
const countryDirs = fs
  .readdirSync(path.join(__dirname, '../src/config'))
  .filter(file => {
    return fs
      .statSync(path.join(__dirname, '../src/config', file))
      .isDirectory();
  });

// Process each country
countryDirs.forEach(country => {
  // Load layers.json
  const layersData = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, `../src/config/${country}/layers.json`),
      'utf-8',
    ),
  );

  // Filter layers with "path" field
  const layersToProcess = Object.entries(layersData).filter(
    ([key, layer]) => layer.path && layer.type === 'boundary',
  );

  layersToProcess.forEach(([key, layer]) => {
    const filePath = path.join(__dirname, `../public/${layer.path}`);
    if (fs.existsSync(filePath)) {
      checkKeysExistence(layer, filePath);
    } else {
      console.warn(`File ${filePath} does not exist.`);
    }
  });
});

process.on('exit', () => {
  if (missingKeys) {
    process.exit(1);
  }
});
