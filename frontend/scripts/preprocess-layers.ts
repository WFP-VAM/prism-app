// Pre-process layers availability dates to avoid doing it on each page load.
// @ts-nocheck
import area from '@turf/area';
import { featureCollection } from '@turf/helpers';
import simplify from '@turf/simplify';
import union from '@turf/union';
import fs from 'fs';
import path from 'path';

import { getFormattedDate } from '../src/utils/date-utils';

// We fix the timezone to UTC to ensure that
// the same dates are generated on all machines
process.env.TZ = 'UTC';

// @turf/area returns square meters; drop tiny islands below this threshold.
const MIN_ISLAND_AREA_M2 = 10_000_000;

const isValidFeature = feature =>
  feature?.type === 'Feature' && feature?.geometry?.coordinates;

const preprocessFeature = feature => {
  if (feature.geometry.type === 'Polygon') {
    const polygonFeature = {
      type: 'Feature',
      properties: {},
      geometry: feature.geometry,
    };
    const polygonArea = area(polygonFeature);
    if (polygonArea < MIN_ISLAND_AREA_M2) {
      return null;
    }
    return {
      ...feature,
      geometry: {
        type: 'Polygon',
        coordinates: [feature.geometry.coordinates[0]],
      },
    };
  }

  if (feature.geometry.type === 'MultiPolygon') {
    const coordinates = feature.geometry.coordinates
      .map(polygon => {
        const nestedPolygonFeature = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: polygon,
          },
        };
        const nestedArea = area(nestedPolygonFeature);
        if (nestedArea < MIN_ISLAND_AREA_M2) {
          console.log('Nested MultiPolygon area too small:', nestedArea);
          return null;
        }
        return polygon;
      })
      .filter(Boolean);

    if (coordinates.length === 0) {
      return null;
    }

    return {
      ...feature,
      geometry: {
        type: 'MultiPolygon',
        coordinates,
      },
    };
  }

  console.warn('Invalid geometry type:', feature.geometry.type);
  return null;
};

// Function to merge boundary data and return a single polygon
const mergeBoundaryData = boundaryData => {
  const features = (boundaryData?.features ?? [])
    .map(preprocessFeature)
    .filter(isValidFeature);

  if (features.length === 0) {
    return null;
  }

  let mergedBoundaryData;
  if (features.length === 1) {
    mergedBoundaryData = features[0];
  } else {
    try {
      mergedBoundaryData = union(featureCollection(features));
    } catch (error) {
      console.warn('Warning: Failed to union boundary features.', error);
      return null;
    }
  }

  if (!mergedBoundaryData?.geometry?.coordinates) {
    return null;
  }

  return simplify(mergedBoundaryData, {
    tolerance: 0.001,
    highQuality: true,
  });
};

async function preprocessBoundaryLayer(country, boundaryLayer) {
  if (country === 'shared') {
    return;
  }
  const outputFilePath = path.join(
    __dirname,
    `../public/data/${country}/admin-boundary-unified-polygon.json`,
  );

  // Check if the output file already exists, always reprocess for Mozambique
  if (country === 'mozambique' || !fs.existsSync(outputFilePath)) {
    const filePath = boundaryLayer.path;
    const fileContent = fs.readFileSync(
      path.join(__dirname, '../public/', filePath),
      'utf-8',
    );
    const boundaryData = JSON.parse(fileContent);
    try {
      const preprocessedData = mergeBoundaryData(boundaryData);
      if (!preprocessedData) {
        console.warn(
          `Warning: No valid boundary geometry produced for ${country}.`,
        );
        return;
      }
      fs.writeFileSync(outputFilePath, JSON.stringify(preprocessedData));
    } catch (error) {
      console.warn(
        `Warning: Failed to merge boundary data for ${country}.`,
        error,
      );
    }
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
        return getFormattedDate(r, format);
      });

      const completeFilePath = path.join(__dirname, '../public/', filePath);

      if (!fs.existsSync(completeFilePath)) {
        console.warn(`Warning: File ${filePath} does not exist.`);
        return {};
      }

      const fileContent = fs.readFileSync(
        path.join(__dirname, '../public/', filePath),
        'utf-8',
      );
      const jsonBody = JSON.parse(fileContent);

      const start = jsonBody.DataList[0][validityPeriod.start_date_field];
      const end = jsonBody.DataList[0][validityPeriod.end_date_field];

      const startDate = new Date(start);
      const endDate = new Date(end);

      startDate.setUTCHours(12, 0, 0, 0);
      endDate.setUTCHours(12, 0, 0, 0);

      return {
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
      };
    }),
  );

  return ranges.filter(ra => ra.startDate && ra.endDate);
}

async function preprocessValidityPeriods(country, layersToProcess) {
  const entries = await Promise.all(
    layersToProcess.map(async ([key, layer]) => {
      const value = await generateIntermediateDateItemFromDataFile(
        layer.dates,
        layer.path,
        layer.validityPeriod,
      );
      return [key, value];
    }),
  );
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const preprocessedData = Object.fromEntries(entries);
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

// Get all country directories (sorted: readdir order + parallel work must not affect outputs)
const countryDirs = fs
  .readdirSync(path.join(__dirname, '../src/config'))
  .filter(file =>
    fs.statSync(path.join(__dirname, '../src/config', file)).isDirectory(),
  )
  .sort((a, b) => a.localeCompare(b));

// Process each country
(async () => {
  const countryFlags = await Promise.all(
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

      // Indonesia uses a manually curated admin-boundary-unified-polygon.json
      if (country === 'indonesia') {
        return dateLayersToProcess.length > 0 ? country : null;
      }

      const boundaryLayerToProcess = Object.values(layersData)
        .filter(layer => layer.type === 'boundary' && layer.admin_level_names)
        .sort(
          (a, b) => a.admin_level_names.length - b.admin_level_names.length,
        )[0];
      await preprocessBoundaryLayer(country, boundaryLayerToProcess);

      return dateLayersToProcess.length > 0 ? country : null;
    }),
  );
  const countriesWithPreprocessedDates = countryFlags
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  fs.writeFileSync(
    path.join(__dirname, '../src/config/countriesWithPreprocessedDates.json'),
    JSON.stringify(countriesWithPreprocessedDates),
  );
})();
