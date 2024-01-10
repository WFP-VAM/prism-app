const moment = require('moment');
const fs = require('fs');
const path = require('path');

// Load layers.json
const layersData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../src/config/rbd/layers.json'),
    'utf-8',
  ),
);

// Filter layers with "path" and "dates" fields
const layersToProcess = Object.values(layersData).filter(
  layer => layer.path && layer.dates,
);

// console.log(layersToProcess);

// Pre-process layers
const preprocessedData = {};

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

  console.log(ranges);

  return ranges.filter(ra => ra.startDate && ra.endDate);
}

(async function () {
  for (const layer of layersToProcess) {
    preprocessedData[
      layer.title
    ] = await generateIntermediateDateItemFromDataFile(
      layer.dates,
      layer.path,
      layer.validityPeriod,
    );
  }
  // Write pre-processed data to a new JSON file
  fs.writeFileSync(
    path.join(__dirname, '../public/data/rbd/preprocessed-layers.json'),
    JSON.stringify(preprocessedData),
  );
})();
