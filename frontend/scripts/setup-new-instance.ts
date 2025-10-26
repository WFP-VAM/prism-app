#!/usr/bin/env node

/* eslint-disable no-console, fp/no-mutation, fp/no-delete, fp/no-mutating-methods */

/**
 * PRISM Instance Setup Tool
 *
 * This tool automates the creation of a new PRISM instance by:
 * 1. Prompting for basic country information
 * 2. Allowing selection of languages
 * 3. Allowing selection of layers from shared layer pool
 * 4. Generating all necessary configuration files
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

interface LayerInfo {
  id: string;
  title: string;
  category: string;
}

interface SetupConfig {
  countryName: string;
  countrySlug: string;
  languages: string[];
  layers: string[];
  boundingBox: [number, number, number, number];
  wmsServers: string[];
  alertFormActive: boolean;
  boundaryFile?: string;
}

// Available languages with their display names
const LANGUAGES: Record<string, string> = {
  en: 'English',
  fr: 'French',
  pt: 'Portuguese',
  es: 'Spanish',
  ar: 'Arabic',
  ru: 'Russian',
  kh: 'Khmer',
  ky: 'Kyrgyz',
  mn: 'Mongolian',
  so: 'Somali',
};

// Shared layers organized by category
const SHARED_LAYERS: LayerInfo[] = [
  {
    id: 'daily_rainfall_forecast',
    title: 'Daily rainfall forecast',
    category: 'Rainfall',
  },
  {
    id: 'dekad_rainfall_forecast',
    title: '10-day rainfall forecast',
    category: 'Rainfall',
  },
  {
    id: 'dekad_rainfall_anomaly_forecast',
    title: '10-day rainfall forecast anomaly',
    category: 'Rainfall',
  },
  {
    id: 'rainfall_daily',
    title: 'Daily rainfall estimate (mm)',
    category: 'Rainfall',
  },
  {
    id: 'rainfall_dekad',
    title: '10-day rainfall estimate (mm)',
    category: 'Rainfall',
  },
  {
    id: 'rain_anomaly_dekad',
    title: '10-day rainfall anomaly',
    category: 'Rainfall',
  },
  {
    id: 'rainfall_agg_1month',
    title: '1-month rainfall aggregate (mm)',
    category: 'Rainfall',
  },
  {
    id: 'rain_anomaly_1month',
    title: 'Monthly rainfall anomaly',
    category: 'Rainfall',
  },
  {
    id: 'rainfall_agg_3month',
    title: '3-month rainfall aggregate (mm)',
    category: 'Rainfall',
  },
  {
    id: 'rain_anomaly_3month',
    title: '3-month rainfall anomaly',
    category: 'Rainfall',
  },
  {
    id: 'rainfall_agg_6month',
    title: '6-month rainfall aggregate (mm)',
    category: 'Rainfall',
  },
  {
    id: 'rain_anomaly_6month',
    title: '6-month rainfall anomaly',
    category: 'Rainfall',
  },
  {
    id: 'rainfall_agg_9month',
    title: '9-month rainfall aggregate (mm)',
    category: 'Rainfall',
  },
  {
    id: 'rain_anomaly_9month',
    title: '9-month rainfall anomaly',
    category: 'Rainfall',
  },
  {
    id: 'rainfall_agg_1year',
    title: '1-year rainfall aggregate (mm)',
    category: 'Rainfall',
  },
  {
    id: 'rain_anomaly_1year',
    title: '1-year rainfall anomaly',
    category: 'Rainfall',
  },
  { id: 'spi_1m', title: 'SPI - 1-month', category: 'Rainfall' },
  { id: 'spi_2m', title: 'SPI - 2-month', category: 'Rainfall' },
  { id: 'spi_3m', title: 'SPI - 3-month', category: 'Rainfall' },
  { id: 'spi_6m', title: 'SPI - 6-month', category: 'Rainfall' },
  { id: 'spi_9m', title: 'SPI - 9-month', category: 'Rainfall' },
  { id: 'spi_1y', title: 'SPI - 1-year', category: 'Rainfall' },
  { id: 'days_dry', title: 'Days since last rain', category: 'Rainfall' },
  { id: 'streak_dry_days', title: 'Longest dry spell', category: 'Rainfall' },
  {
    id: 'days_heavy_rain',
    title: 'Number of days with heavy rainfall',
    category: 'Rainfall',
  },
  {
    id: 'days_intense_rain',
    title: 'Number of days with intense rainfall',
    category: 'Rainfall',
  },
  {
    id: 'days_extreme_rain',
    title: 'Number of days with extreme rainfall',
    category: 'Rainfall',
  },
  { id: 'ndvi_dekad', title: '10-day NDVI (MODIS)', category: 'Vegetation' },
  {
    id: 'ndvi_dekad_anomaly',
    title: '10-day NDVI anomaly (MODIS)',
    category: 'Vegetation',
  },
  {
    id: 'lst_amplitude',
    title: 'Land Surface Temperature - 10-day Amplitude',
    category: 'Temperature',
  },
  {
    id: 'lst_daytime',
    title: 'Daytime Land Surface Temperature',
    category: 'Temperature',
  },
  {
    id: 'lst_nighttime',
    title: 'Nighttime Land Surface Temperature',
    category: 'Temperature',
  },
  {
    id: 'lst_anomaly',
    title: 'Land Surface Temperature Anomaly',
    category: 'Temperature',
  },
  { id: 'wp_pop_cicunadj', title: 'Population', category: 'Exposure' },
  {
    id: 'adamts_buffers',
    title: 'Tropical Storms - Wind buffers',
    category: 'Hazards',
  },
  { id: 'adamts_nodes', title: 'Tropical Storms - Nodes', category: 'Hazards' },
  {
    id: 'adamts_tracks',
    title: 'Tropical Storms - Tracks',
    category: 'Hazards',
  },
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

function close(): void {
  rl.close();
}

// Helper function to create slug from country name
function createSlug(countryName: string): string {
  return countryName.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

async function collectCountryInfo(): Promise<SetupConfig> {
  console.log('\n=== PRISM Instance Setup Tool ===\n');

  // 1. Country name
  const countryName = await question(
    'Enter country name (e.g., "South Africa"): ',
  );
  const countrySlug = createSlug(countryName);

  console.log(`\nCountry slug: ${countrySlug}`);

  // Check if country already exists
  const configDir = path.join(__dirname, '../src/config', countrySlug);
  if (fs.existsSync(configDir)) {
    const overwrite = await question(
      '\n⚠️  Country configuration already exists. Overwrite? (yes/no): ',
    );
    if (overwrite.toLowerCase() !== 'yes') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  // 2. Languages
  console.log('\n--- Language Selection ---');
  console.log('Available languages:');
  Object.entries(LANGUAGES).forEach(([code, name]) => {
    console.log(`  ${code}: ${name}`);
  });

  const languagesInput = await question(
    '\nEnter language codes (comma-separated, e.g., "en,fr,pt"): ',
  );
  const languages = languagesInput
    .split(',')
    .map(l => l.trim())
    .filter(Boolean);

  if (languages.length === 0) {
    console.log('Using default language: en');
    languages.push('en');
  }

  // 3. Layers
  console.log('\n--- Layer Selection ---');
  console.log('Available layers by category:');

  const layersByCategory = SHARED_LAYERS.reduce(
    (acc, layer) => {
      if (!acc[layer.category]) {
        acc[layer.category] = [];
      }
      acc[layer.category].push(layer);
      return acc;
    },
    {} as Record<string, LayerInfo[]>,
  );

  Object.entries(layersByCategory).forEach(([category, layers]) => {
    console.log(`\n${category}:`);
    layers.forEach(layer => {
      console.log(`  [${layer.id}] ${layer.title}`);
    });
  });

  const layersInput = await question(
    '\nEnter layer IDs to include (comma-separated, or "all" for all): ',
  );
  let selectedLayers: string[];

  if (layersInput.trim().toLowerCase() === 'all') {
    selectedLayers = SHARED_LAYERS.map(l => l.id);
  } else {
    selectedLayers = layersInput
      .split(',')
      .map(l => l.trim())
      .filter(Boolean);
  }

  // 4. Bounding box
  console.log('\n--- Map Configuration ---');
  console.log(
    'Enter bounding box coordinates [minLon, minLat, maxLon, maxLat]',
  );
  const minLon = parseFloat(await question('Min Longitude: '));
  const minLat = parseFloat(await question('Min Latitude: '));
  const maxLon = parseFloat(await question('Max Longitude: '));
  const maxLat = parseFloat(await question('Max Latitude: '));

  // 5. WMS Servers
  console.log('\n--- WMS Server Configuration ---');
  const wmsServersInput = await question(
    'Enter WMS server URLs (comma-separated, or press Enter for default): ',
  );
  const wmsServers = wmsServersInput.trim()
    ? wmsServersInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : ['https://api.earthobservation.vam.wfp.org/ows/wms'];

  // 6. Alert Form
  const alertFormInput = await question('\nEnable alert form? (yes/no): ');
  const alertFormActive = alertFormInput.toLowerCase() === 'yes';

  // 7. Boundary file
  const boundaryFile = await question(
    'Enter boundary filename (e.g., "boundary.json", or press Enter to skip): ',
  );

  return {
    countryName,
    countrySlug,
    languages,
    layers: selectedLayers,
    boundingBox: [minLon, minLat, maxLon, maxLat],
    wmsServers,
    alertFormActive,
    boundaryFile: boundaryFile.trim() || undefined,
  };
}

function generateCategories(layers: string[]): Record<string, any> {
  const categories: Record<string, any> = {
    rainfall: { rainfall_data: [] },
    vegetation: { vegetation_data: [] },
    temperature: { temperature_data: [] },
    hazards: { tropical_storms: [] },
    exposure: { population_data: [] },
  };

  layers.forEach(layerId => {
    const layer = SHARED_LAYERS.find(l => l.id === layerId);
    if (!layer) {
      return;
    }

    switch (layer.category) {
      case 'Rainfall':
        if (!categories.rainfall.rainfall_data.includes(layerId)) {
          categories.rainfall.rainfall_data.push(layerId);
        }
        break;
      case 'Vegetation':
        if (!categories.vegetation.vegetation_data.includes(layerId)) {
          categories.vegetation.vegetation_data.push(layerId);
        }
        break;
      case 'Temperature':
        if (!categories.temperature.temperature_data.includes(layerId)) {
          categories.temperature.temperature_data.push(layerId);
        }
        break;
      case 'Hazards':
        if (!categories.hazards.tropical_storms.includes(layerId)) {
          categories.hazards.tropical_storms.push(layerId);
        }
        break;
      case 'Exposure':
        if (!categories.exposure.population_data.includes(layerId)) {
          categories.exposure.population_data.push(layerId);
        }
        break;
      default:
        // Category not supported
        break;
    }
  });

  // Remove empty categories
  Object.keys(categories).forEach(key => {
    const category = categories[key];
    const hasContent = Object.values(category).some(
      (arr: any) => Array.isArray(arr) && arr.length > 0,
    );
    if (!hasContent) {
      delete categories[key];
    } else {
      // Clean up empty arrays
      Object.keys(category).forEach(subKey => {
        if (Array.isArray(category[subKey]) && category[subKey].length === 0) {
          delete category[subKey];
        }
      });
    }
  });

  return categories;
}

function generatePrismJson(config: SetupConfig): any {
  return {
    country: config.countryName,
    defaultLanguage: config.languages[0],
    alertFormActive: config.alertFormActive,
    icons: {
      vulnerability: 'icon_vulnerable.png',
      exposure: 'icon_basemap.png',
      hazards: 'icon_climate.png',
      risk: 'icon_impact.png',
      capacity: 'icon_capacity.png',
      tables: 'icon_table.png',
      rainfall: 'icon_rain.png',
      vegetation: 'icon_veg.png',
      temperature: 'icon_climate.png',
    },
    serversUrls: {
      wms: config.wmsServers,
    },
    map: {
      boundingBox: config.boundingBox,
    },
    categories: generateCategories(config.layers),
  };
}

function generateIndexTs(config: SetupConfig): string {
  return `import appConfig from './prism.json';
import rawLayers from './layers.json';

const rawTables = {};
const rawReports = {};

const translation = { ${config.languages.map(l => `${l}: {}`).join(', ')} };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: ${config.boundaryFile ? `'${config.boundaryFile}'` : 'undefined'},
};
`;
}

function generateLayersJson(): any {
  // Return empty object as country-specific layers would go here
  // Shared layers are automatically available
  return {};
}

async function writeFiles(config: SetupConfig): Promise<void> {
  const countryDir = path.join(__dirname, '../src/config', config.countrySlug);

  // Create directory
  if (!fs.existsSync(countryDir)) {
    fs.mkdirSync(countryDir, { recursive: true });
  }

  // Generate and write files
  const prismJson = generatePrismJson(config);
  const indexContent = generateIndexTs(config);
  const layersJson = generateLayersJson();

  fs.writeFileSync(
    path.join(countryDir, 'prism.json'),
    JSON.stringify(prismJson, null, 2),
  );

  fs.writeFileSync(path.join(countryDir, 'index.ts'), indexContent);

  fs.writeFileSync(
    path.join(countryDir, 'layers.json'),
    JSON.stringify(layersJson, null, 2),
  );

  // Create empty tables.json and reports.json
  fs.writeFileSync(
    path.join(countryDir, 'tables.json'),
    JSON.stringify({}, null, 2),
  );

  fs.writeFileSync(
    path.join(countryDir, 'reports.json'),
    JSON.stringify({}, null, 2),
  );

  console.log(`\n✓ Files created in: ${countryDir}`);
}

async function updateMainConfig(config: SetupConfig): Promise<void> {
  const mainConfigPath = path.join(__dirname, '../src/config/index.ts');

  if (!fs.existsSync(mainConfigPath)) {
    console.log('⚠️  Main config file not found.');
    return;
  }

  const mainConfigContent = fs.readFileSync(mainConfigPath, 'utf-8');

  // Check if already added
  if (mainConfigContent.includes(`import ${config.countrySlug} from`)) {
    console.log(
      `\n✓ Country ${config.countrySlug} already exists in main config`,
    );
    return;
  }

  console.log(
    `\n⚠️  IMPORTANT: You need to manually add the following to frontend/src/config/index.ts:`,
  );
  console.log(
    `\n1. Add this import line (before the countriesWithPreprocessedDates import):`,
  );
  console.log(
    `   import ${config.countrySlug} from './${config.countrySlug}';`,
  );
  console.log(
    `\n2. Add ${config.countrySlug} to the configMap object (before the closing brace):`,
  );
  console.log(`   ${config.countrySlug},`);
  console.log(`\nThis is a manual step to ensure proper formatting.`);
}

async function main(): Promise<void> {
  try {
    const config = await collectCountryInfo();

    console.log('\n--- Generating Configuration Files ---');
    await writeFiles(config);

    console.log('\n--- Updating Main Configuration ---');
    await updateMainConfig(config);

    console.log('\n✅ Configuration complete!');
    console.log(`\nNext steps:`);
    console.log(
      `1. Update the language translations in frontend/src/config/${config.countrySlug}/index.ts`,
    );
    console.log(
      `2. Add country-specific layers if needed in frontend/src/config/${config.countrySlug}/layers.json`,
    );
    console.log(
      `3. Upload boundary file to S3: prsm-admin-boundaries/${config.boundaryFile || config.countrySlug}.json`,
    );
    console.log(
      `4. Set REACT_APP_COUNTRY=${config.countrySlug} environment variable`,
    );
    console.log(`5. Build and deploy`);

    close();
  } catch (error) {
    console.error('Error:', error);
    close();
    process.exit(1);
  }
}

main();
