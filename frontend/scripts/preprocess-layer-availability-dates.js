// Pre-process layers availability dates to avoid doing it on each page load.
const moment = require('moment');
const fs = require('fs');
const path = require('path');

// We fix the timezone to UTC to ensure that
// the same dates are generated on all machines
process.env.TZ = 'UTC';

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
      const layersToProcess = Object.entries(layersData).filter(
        ([key, layer]) => layer.path && layer.dates && layer.validityPeriod,
      );

      await preprocessValidityPeriods(country, layersToProcess);
    }),
  );
})();
