// Pre-process layers availability dates to avoid doing it on each page load.
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const union = require('@turf/union').default;
const simplify = require('@turf/simplify').default;

// We fix the timezone to UTC to ensure that
// the same dates are generated on all machines
process.env.TZ = 'UTC';

// Function to merge boundary data and return a single polygon
const mergeBoundaryData = boundaryData => {
  let mergedBoundaryData = null;
  if ((boundaryData?.features.length || 0) > 0) {
    // eslint-disable-next-line fp/no-mutation
    mergedBoundaryData =
      boundaryData?.features.reduce((acc, feature) => {
        if (acc === null) {
          return feature;
        }
        return union(acc, feature);
      }, null) || null;
  }
  return simplify(mergedBoundaryData, { tolerance: 0.001, highQuality: true });
};

async function preprocessBoundaryLayer(country, boundaryLayer) {
  const outputFilePath = path.join(
    __dirname,
    `../public/data/${country}/admin-boundary-unified-polygon.json`,
  );

  // Check if the output file already exists
  if (!fs.existsSync(outputFilePath)) {
    const filePath = boundaryLayer.path;
    const fileContent = fs.readFileSync(
      path.join(__dirname, '../public/', filePath),
      'utf-8',
    );
    const boundaryData = JSON.parse(fileContent);
    const preprocessedData = mergeBoundaryData(boundaryData);

    fs.writeFileSync(outputFilePath, JSON.stringify(preprocessedData));
  }
}

async function generateIntermediateDateItemFromDataFile(
  layerDates,
  layerPathTemplate,
  validityPeriod,
) {
  const ranges = await Promise.all(
    layerDates.map(async r => {
      const filePath = layerPathTemplate.replace(/{.*?}/g, match => {
        const format = match.slice(1, -1);
        return moment(r).format(format);
      });

      const completeFilePath = path.join(__dirname, '../public/', filePath);

      if (!fs.existsSync(completeFilePath)) {
        console.log(`Warning: File ${filePath} does not exist.`);
        return {};
      }

      const fileContent = fs.readFileSync(
        path.join(__dirname, '../public/', filePath),
        'utf-8',
      );
      const jsonBody = JSON.parse(fileContent);

      const startDate = jsonBody.DataList[0][validityPeriod.start_date_field];
      const endDate = jsonBody.DataList[0][validityPeriod.end_date_field];

      return {
        startDate: moment(startDate).set({ hour: 12, minute: 0 }).valueOf(),
        endDate: moment(endDate).set({ hour: 12, minute: 0 }).valueOf(),
      };
    }),
  );

  return ranges.filter(ra => ra.startDate && ra.endDate);
}

async function preprocessValidityPeriods(country, layersToProcess) {
  const preprocessedData = {};

  await Promise.all(
    layersToProcess.map(async ([key, layer]) => {
      preprocessedData[key] = await generateIntermediateDateItemFromDataFile(
        layer.dates,
        layer.path,
        layer.validityPeriod,
      );
    }),
  );
  if (Object.keys(preprocessedData).length === 0) {
    return;
  }
  // Write pre-processed data to a new JSON file
  fs.writeFileSync(
    path.join(
      __dirname,
      `../public/data/${country}/preprocessed-layer-dates.json`,
    ),
    JSON.stringify(preprocessedData),
  );
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
(async () => {
  await Promise.all(
    countryDirs.map(async country => {
      // Load layers.json
      const layersData = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, `../src/config/${country}/layers.json`),
          'utf-8',
        ),
      );

      // Filter layers with "path" and "dates" fields
      const dateLayersToProcess = Object.entries(layersData).filter(
        ([, layer]) => layer.path && layer.dates && layer.validityPeriod,
      );
      await preprocessValidityPeriods(country, dateLayersToProcess);

      // Some countries with complex boundaries are not processed and fetched independently
      // eg. using the detailed version on https://cartographyvectors.com/
      if (
        [
          'cambodia',
          'ecuador',
          'indonesia',
          'mozambique',
          'myanmar',
          'sierraleone',
        ].includes(country)
      ) {
        return;
      }
      const boundaryLayerToProcess = Object.values(layersData)
        .filter(layer => layer.type === 'boundary' && layer.admin_level_names)
        .sort(
          (a, b) => a.admin_level_names.length - b.admin_level_names.length,
        )[0];
      await preprocessBoundaryLayer(country, boundaryLayerToProcess);
    }),
  );
})();
