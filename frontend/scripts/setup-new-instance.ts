#!/usr/bin/env node

/* eslint-disable no-console */

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

import { findClosestCountry } from './utils/country-bounding-boxes';

// no readline - using enquirer for all prompts
// Interactive prompts
const { MultiSelect, Input, Confirm } = require('enquirer');

interface LayerInfo {
  id: string;
  title: string;
  category: string;
  type?: string;
}

interface SetupConfig {
  countryName: string;
  countrySlug: string;
  languages: string[];
  layers: string[];
  boundingBox: [number, number, number, number];
  wmsServers: string[];
  alertFormActive: boolean;
  boundaryFile?: string; // default admin3 file basename
  boundaryFiles?: {
    admin1?: string; // absolute or relative source path
    admin2?: string;
    admin3?: string;
  };
  defaultDisplayBoundaries?: string[];
}

// Available languages with their display names
const LANGUAGES: Record<string, string> = {
  en: 'English',
  fr: 'French',
  pt: 'Portuguese',
  es: 'Spanish',
  ar: 'Arabic',
  ru: 'Russian',
  km: 'Khmer',
  ky: 'Kyrgyz',
  mn: 'Mongolian',
  so: 'Somali',
};

// Load shared layers dynamically
function loadSharedLayers(): LayerInfo[] {
  const sharedLayersPath = path.join(
    __dirname,
    '../src/config/shared/layers.json',
  );
  const sharedLayers = JSON.parse(fs.readFileSync(sharedLayersPath, 'utf-8'));

  const layers: LayerInfo[] = [];

  Object.entries(sharedLayers).forEach(([id, layerData]: [string, any]) => {
    // Skip boundary layers
    if (layerData.type === 'boundary') {
      return;
    }

    // Determine category based on layer data
    let category = 'Other';
    const title = layerData.title || id;

    // Categorize based on layer properties and naming
    if (
      id.includes('rain') ||
      id.includes('precip') ||
      id.includes('spi') ||
      id.includes('dry') ||
      id.includes('rfh') ||
      id.includes('rfq')
    ) {
      category = 'Rainfall';
    } else if (
      id.includes('ndvi') ||
      id.includes('vegetation') ||
      id.includes('veg')
    ) {
      category = 'Vegetation';
    } else if (
      id.includes('lst') ||
      id.includes('temp') ||
      id.includes('temperature')
    ) {
      category = 'Temperature';
    } else if (
      id.includes('storm') ||
      id.includes('adamts') ||
      id.includes('tc') ||
      id.includes('cyclone') ||
      id.includes('hurricane')
    ) {
      category = 'Hazards';
    } else if (
      id.includes('pop') ||
      id.includes('population') ||
      id.includes('exposure')
    ) {
      category = 'Exposure';
    } else if (
      id.includes('vulnerability') ||
      id.includes('vuln') ||
      id.includes('poverty')
    ) {
      category = 'Vulnerability';
    } else if (id.includes('capacity') || id.includes('preparedness')) {
      category = 'Capacity';
    } else if (
      id.includes('risk') ||
      id.includes('impact') ||
      id.includes('damage')
    ) {
      category = 'Risk';
    }

    layers.push({
      id,
      title,
      category,
      type: layerData.type,
    });
  });

  return layers;
}

// Shared layers organized by category
const SHARED_LAYERS: LayerInfo[] = loadSharedLayers();

// no readline helpers

// Helper function to create slug from country name
function createSlug(countryName: string): string {
  return countryName.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

async function collectCountryInfo(): Promise<SetupConfig> {
  console.log('\n=== PRISM Instance Setup Tool ===\n');

  // 1. Country name
  const countryName: string = await new Input({
    message: 'Enter country name (e.g., "South Africa"):',
  }).run();
  const countrySlug = createSlug(countryName);

  console.log(`\nCountry slug: ${countrySlug}`);

  // Check if country already exists
  const configDir = path.join(__dirname, '../src/config', countrySlug);
  if (fs.existsSync(configDir)) {
    const overwriteAffirmative: boolean = await new Confirm({
      message: '⚠️  Country configuration already exists. Overwrite?',
      initial: false,
      format: (value: boolean) => (value ? 'y' : 'n'),
    }).run();
    if (!overwriteAffirmative) {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  // 2. Languages
  console.log('\n--- Language Selection ---');
  const languagePrompt = new MultiSelect({
    name: 'languages',
    message: 'Select languages (space to toggle, enter to confirm)',
    hint: 'Use arrow keys to navigate',
    choices: Object.entries(LANGUAGES).map(([code, name]) => ({
      name: code,
      message: `${name} (${code})`,
      value: code,
    })),
    initial: ['en'],
  });
  const languages: string[] = (await languagePrompt.run()) as string[];

  if (languages.length === 0) {
    console.log('Using default language: en');
    languages.push('en');
  }

  // 3. Layers
  console.log('\n--- Layer Selection ---');
  // Group by category and build a flat list with category labels
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

  const choices = [
    // Special ALL option
    { name: '__ALL_LAYERS__', message: 'All layers', value: '__ALL_LAYERS__' },
    { role: 'separator', message: '' },
    // Grouped by category
    ...Object.entries(layersByCategory).flatMap(([category, layers]) => [
      { role: 'separator', message: `\n${category}` },
      ...layers.map(l => ({ name: l.id, message: l.title, value: l.id })),
    ]),
  ];

  const layerPrompt = new MultiSelect({
    name: 'layers',
    message:
      'Select layers to include (space to toggle, enter to confirm). Use search to filter.',
    hint: 'Use arrow keys to navigate',
    choices,
    // Large lists usability
    footer: false,
    multiple: true,
    // @ts-ignore enquirer supports search option
    searchable: true,
  });
  let selectedLayers: string[] = (await layerPrompt.run()) as string[];
  // If user selects "All layers" or just hits Enter with nothing selected,
  // default to including all shared layers.
  if (
    selectedLayers.length === 0 ||
    selectedLayers.includes('__ALL_LAYERS__')
  ) {
    selectedLayers = SHARED_LAYERS.map(l => l.id);
  }

  // 4. Bounding box
  console.log('\n--- Map Configuration ---');

  // Try to find suggested bounding box
  const suggestedCountry = await findClosestCountry(countryName);
  let useSuggested = false;

  if (suggestedCountry) {
    const [matchedName, bbox] = suggestedCountry;
    console.log(`\n📍 Found suggested bounding box for "${matchedName}":`);
    console.log(`   Min Longitude: ${bbox[0]}`);
    console.log(`   Min Latitude: ${bbox[1]}`);
    console.log(`   Max Longitude: ${bbox[2]}`);
    console.log(`   Max Latitude: ${bbox[3]}`);

    useSuggested = await new Confirm({
      message: 'Use these suggested coordinates?',
      initial: true,
      format: (value: boolean) => (value ? 'y' : 'n'),
    }).run();

    if (useSuggested) {
      console.log('Using suggested bounding box coordinates.');
    } else {
      console.log('Please enter custom bounding box coordinates:');
    }
  } else {
    console.log(
      'No matching country found. Please enter bounding box coordinates manually:',
    );
  }

  let minLon: number;
  let minLat: number;
  let maxLon: number;
  let maxLat: number;

  if (useSuggested && suggestedCountry) {
    const [, bbox] = suggestedCountry;
    [minLon, minLat, maxLon, maxLat] = bbox;
  } else {
    minLon = parseFloat(await new Input({ message: 'Min Longitude:' }).run());
    minLat = parseFloat(await new Input({ message: 'Min Latitude:' }).run());
    maxLon = parseFloat(await new Input({ message: 'Max Longitude:' }).run());
    maxLat = parseFloat(await new Input({ message: 'Max Latitude:' }).run());
  }

  // 5. WMS Servers
  console.log('\n--- WMS Server Configuration ---');
  const wmsServersInput = await new Input({
    message:
      'Enter WMS server URLs (comma-separated, or press Enter for default, https://api.earthobservation.vam.wfp.org/ows/wms):',
  }).run();
  const wmsServers = wmsServersInput.trim()
    ? wmsServersInput
        .split(',')
        .map((serverUrl: string) => serverUrl.trim())
        .filter((url: string) => Boolean(url))
    : ['https://api.earthobservation.vam.wfp.org/ows/wms'];

  // 6. Alert Form
  const alertFormActive: boolean = await new Confirm({
    message: 'Enable alert form?',
    initial: false,
    format: (value: boolean) => (value ? 'y' : 'n'),
  }).run();

  // 7. Boundary files (paths)
  console.log('\n--- Boundary Files ---');
  console.log(
    'Provide paths to admin boundary files. If left empty, Mozambique defaults are used temporarily.',
  );
  console.log(
    "💡 Tip: If you don't have boundary files, you can download them from https://www.geoboundaries.org/",
  );
  const admin1Path = await new Input({
    message:
      'Path to admin1 boundary file (e.g., /abs/path/adm1.json), or Enter to skip:',
  }).run();
  const admin2Path = await new Input({
    message:
      'Path to admin2 boundary file (e.g., /abs/path/adm2.json), or Enter to skip:',
  }).run();
  const admin3Path = await new Input({
    message:
      'Path to admin3 boundary file (e.g., /abs/path/adm3.json), or Enter to skip:',
  }).run();
  const boundaryFiles = {
    admin1: admin1Path.trim() || undefined,
    admin2: admin2Path.trim() || undefined,
    admin3: admin3Path.trim() || undefined,
  };
  const boundaryFile = boundaryFiles.admin3
    ? path.basename(boundaryFiles.admin3)
    : 'moz_bnd_adm3_WFP.json';

  // 8. Default display boundaries
  console.log('\n--- Boundary Layers Configuration ---');
  const boundaryChoice = new MultiSelect({
    name: 'defaultBoundaries',
    message:
      'Select boundary layers to display by default (space to toggle, enter to confirm)',
    choices: [
      { name: 'admin1_boundaries', message: 'admin1' },
      { name: 'admin2_boundaries', message: 'admin2' },
      { name: 'admin3_boundaries', message: 'admin3' },
    ],
    initial: ['admin1_boundaries', 'admin2_boundaries'],
  });
  const defaultDisplayBoundaries: string[] =
    (await boundaryChoice.run()) as string[];

  return {
    countryName,
    countrySlug,
    languages,
    layers: selectedLayers,
    boundingBox: [minLon, minLat, maxLon, maxLat],
    wmsServers,
    alertFormActive,
    boundaryFile: boundaryFile || undefined,
    boundaryFiles,
    defaultDisplayBoundaries,
  };
}

type GroupLayerSpec = { id: string; label: string; main?: boolean };

interface LayerGroupSpec {
  group_title: string;
  activate_all: boolean;
  /** Top-level prism.json category key (rainfall, vegetation, ...) */
  categoryKey: string;
  /** Nested menu section key (global_rainfall_products, extreme_rain_events, ...) */
  subcategoryKey: string;
  layers: GroupLayerSpec[];
}

// Period-based shared layers should render as one menu row + selector,
// matching existing country prism.json files (Mozambique, Namibia, etc.).
const LAYER_GROUPS: LayerGroupSpec[] = [
  {
    group_title: 'Rainfall aggregate',
    activate_all: false,
    categoryKey: 'rainfall',
    subcategoryKey: 'global_rainfall_products',
    layers: [
      { id: 'rainfall_daily', label: 'Daily' },
      { id: 'rainfall_dekad', label: '10-day', main: true },
      { id: 'rainfall_agg_1month', label: '1-month' },
      { id: 'rainfall_agg_2month', label: '2-month' },
      { id: 'rainfall_agg_3month', label: '3-month' },
      { id: 'rainfall_agg_4month', label: '4-month' },
      { id: 'rainfall_agg_5month', label: '5-month' },
      { id: 'rainfall_agg_6month', label: '6-month' },
      { id: 'rainfall_agg_7month', label: '7-month' },
      { id: 'rainfall_agg_8month', label: '8-month' },
      { id: 'rainfall_agg_9month', label: '9-month' },
      { id: 'rainfall_agg_1year', label: '1-year' },
    ],
  },
  {
    group_title: 'Rainfall anomaly',
    activate_all: false,
    categoryKey: 'rainfall',
    subcategoryKey: 'global_rainfall_products',
    layers: [
      { id: 'rain_anomaly_dekad', label: '10-day', main: true },
      { id: 'rain_anomaly_1month', label: '1-month' },
      { id: 'rain_anomaly_2month', label: '2-month' },
      { id: 'rain_anomaly_3month', label: '3-month' },
      { id: 'rain_anomaly_4month', label: '4-month' },
      { id: 'rain_anomaly_5month', label: '5-month' },
      { id: 'rain_anomaly_6month', label: '6-month' },
      { id: 'rain_anomaly_7month', label: '7-month' },
      { id: 'rain_anomaly_8month', label: '8-month' },
      { id: 'rain_anomaly_9month', label: '9-month' },
      { id: 'rain_anomaly_1year', label: '1-year' },
    ],
  },
  {
    group_title: 'SPI',
    activate_all: false,
    categoryKey: 'rainfall',
    subcategoryKey: 'global_rainfall_products',
    layers: [
      { id: 'spi_1m', label: '1-month', main: true },
      { id: 'spi_2m', label: '2-month' },
      { id: 'spi_3m', label: '3-month' },
      { id: 'spi_6m', label: '6-month' },
      { id: 'spi_9m', label: '9-month' },
      { id: 'spi_1y', label: '1-year' },
    ],
  },
  {
    group_title: 'Number of days of rainfall:',
    activate_all: false,
    categoryKey: 'rainfall',
    subcategoryKey: 'extreme_rain_events',
    layers: [
      { id: 'days_heavy_rain', label: 'Heavy (>75th percentile)', main: true },
      {
        id: 'days_intense_rain',
        label: 'Intense (>90th percentile)',
        main: true,
      },
      {
        id: 'days_extreme_rain',
        label: 'Extreme (>95th percentile)',
        main: true,
      },
    ],
  },
  {
    group_title: 'Consecutive days of rainfall:',
    activate_all: false,
    categoryKey: 'rainfall',
    subcategoryKey: 'extreme_rain_events',
    layers: [
      {
        id: 'streak_heavy_rain',
        label: 'Heavy (>75th percentile)',
        main: true,
      },
      {
        id: 'streak_intense_rain',
        label: 'Intense (>90th percentile)',
        main: true,
      },
      {
        id: 'streak_extreme_rain',
        label: 'Extreme (>95th percentile)',
        main: true,
      },
    ],
  },
];

const LAYER_SUBCATEGORY_OVERRIDE: Record<
  string,
  { categoryKey: string; subcategoryKey: string }
> = {
  daily_rainfall_forecast: {
    categoryKey: 'rainfall',
    subcategoryKey: 'forecasts',
  },
  dekad_rainfall_forecast: {
    categoryKey: 'rainfall',
    subcategoryKey: 'forecasts',
  },
  dekad_rainfall_anomaly_forecast: {
    categoryKey: 'rainfall',
    subcategoryKey: 'forecasts',
  },
  days_dry: { categoryKey: 'rainfall', subcategoryKey: 'dry_periods' },
  streak_dry_days: { categoryKey: 'rainfall', subcategoryKey: 'dry_periods' },
};

const CATEGORY_KEY_BY_LAYER_CATEGORY: Record<string, string> = {
  Rainfall: 'rainfall',
  Vegetation: 'vegetation',
  Temperature: 'temperature',
  Hazards: 'hazards',
  Exposure: 'exposure',
};

const DEFAULT_SUBCATEGORY_BY_CATEGORY_KEY: Record<string, string> = {
  rainfall: 'global_rainfall_products',
  vegetation: 'vegetation_conditions',
  temperature: 'land_surface_temperature',
  hazards: 'tropical_storms',
  exposure: 'population_data',
};

function ensureSubcategory(
  categories: Record<string, any>,
  categoryKey: string,
  subcategoryKey: string,
): any[] {
  if (!categories[categoryKey]) {
    categories[categoryKey] = {};
  }
  if (!categories[categoryKey][subcategoryKey]) {
    categories[categoryKey][subcategoryKey] = [];
  }
  return categories[categoryKey][subcategoryKey];
}

type GroupedMenuItem =
  | string
  | {
      group_title: string;
      activate_all: boolean;
      layers: GroupLayerSpec[];
    };

function pickGroupFromSelection(
  spec: LayerGroupSpec,
  selected: Set<string>,
): GroupedMenuItem | null {
  const picked = spec.layers.filter(layer => selected.has(layer.id));
  if (picked.length === 0) {
    return null;
  }
  if (picked.length === 1) {
    return picked[0].id;
  }
  const hasMain = picked.some(layer => layer.main);
  return {
    group_title: spec.group_title,
    activate_all: spec.activate_all,
    layers: picked.map((layer, index) => ({
      id: layer.id,
      label: layer.label,
      ...(layer.main || (!hasMain && index === 0) ? { main: true } : {}),
    })),
  };
}

function generateCategories(layers: string[]): Record<string, any> {
  const selected = new Set(layers);
  const consumed = new Set<string>();
  const categories: Record<string, any> = {};

  LAYER_GROUPS.forEach(spec => {
    const item = pickGroupFromSelection(spec, selected);
    if (item === null) {
      return;
    }
    spec.layers.forEach(layer => {
      if (selected.has(layer.id)) {
        consumed.add(layer.id);
      }
    });
    ensureSubcategory(categories, spec.categoryKey, spec.subcategoryKey).push(
      item,
    );
  });

  layers.forEach(layerId => {
    if (consumed.has(layerId)) {
      return;
    }
    const layer = SHARED_LAYERS.find(l => l.id === layerId);
    if (!layer) {
      return;
    }
    const override = LAYER_SUBCATEGORY_OVERRIDE[layerId];
    const categoryKey =
      override?.categoryKey || CATEGORY_KEY_BY_LAYER_CATEGORY[layer.category];
    if (!categoryKey) {
      return;
    }
    const subcategoryKey =
      override?.subcategoryKey ||
      DEFAULT_SUBCATEGORY_BY_CATEGORY_KEY[categoryKey];
    const bucket = ensureSubcategory(categories, categoryKey, subcategoryKey);
    if (!bucket.includes(layerId)) {
      bucket.push(layerId);
    }
  });

  return categories;
}

function generatePrismJson(config: SetupConfig): any {
  return {
    country: config.countryName,
    defaultLanguage: config.languages[0],
    alertFormActive: config.alertFormActive,
    serversUrls: {
      wms: config.wmsServers,
    },
    map: {
      boundingBox: config.boundingBox,
    },
    ...(config.defaultDisplayBoundaries &&
    config.defaultDisplayBoundaries.length > 0
      ? { defaultDisplayBoundaries: config.defaultDisplayBoundaries }
      : {}),
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
  // Boundary layers will be injected during writeFiles based on provided paths
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
  // If boundary files were provided, copy them into public/data/{countrySlug}
  const publicDataDir = path.join(
    __dirname,
    '../public/data',
    config.countrySlug,
  );
  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }

  const copiedBoundaries: {
    admin1?: string;
    admin2?: string;
    admin3?: string;
  } = {};
  (['admin1', 'admin2', 'admin3'] as const).forEach(level => {
    const src = config.boundaryFiles?.[level];
    if (src && fs.existsSync(src)) {
      const destName = path.basename(src);
      const destPath = path.join(publicDataDir, destName);
      try {
        fs.copyFileSync(src, destPath);
        copiedBoundaries[level] = `data/${config.countrySlug}/${destName}`;
      } catch (err) {
        console.warn(`Warning: failed to copy ${level} boundary file:`, err);
      }
    }
  });

  // Build boundary layers; if not provided, copy Mozambique defaults into the new country folder and reference them there
  const mozDefaults = {
    admin1: path.join(
      __dirname,
      '../public/data/mozambique/moz_bnd_adm1_WFP.json',
    ),
    admin2: path.join(
      __dirname,
      '../public/data/mozambique/moz_bnd_adm2_WFP.json',
    ),
    admin3: path.join(
      __dirname,
      '../public/data/mozambique/moz_bnd_adm3_WFP.json',
    ),
  } as const;

  (['admin1', 'admin2', 'admin3'] as const).forEach(level => {
    if (!copiedBoundaries[level]) {
      const mozSrc = mozDefaults[level];
      if (fs.existsSync(mozSrc)) {
        const destName = path.basename(mozSrc);
        const destPath = path.join(publicDataDir, destName);
        try {
          fs.copyFileSync(mozSrc, destPath);
          copiedBoundaries[level] = `data/${config.countrySlug}/${destName}`;
        } catch (err) {
          console.warn(
            `Warning: failed to copy Mozambique default ${level} file:`,
            err,
          );
        }
      }
    }
  });

  const boundaryLayers = {
    admin1_boundaries: {
      type: 'boundary',
      path: copiedBoundaries.admin1!,
      opacity: 0.8,
      admin_code: 'adm1_source_id',
      admin_level_codes: ['adm1_source_id'],
      admin_level_names: ['adm1_name'],
      admin_level_local_names: ['adm1_name'],
      'styles:': {
        fill: { 'fill-opacity': 0 },
        line: { 'line-color': 'gray', 'line-width': 2, 'line-opacity': 0.8 },
      },
    },
    admin2_boundaries: {
      type: 'boundary',
      path: copiedBoundaries.admin2!,
      opacity: 0.8,
      admin_code: 'adm2_source_id',
      admin_level_codes: ['adm1_source_id', 'adm2_source_id'],
      admin_level_names: ['adm1_name', 'adm2_name'],
      admin_level_local_names: ['adm1_name', 'adm2_name'],
      'styles:': {
        fill: { 'fill-opacity': 0 },
        line: { 'line-color': 'gray', 'line-width': 1, 'line-opacity': 0.8 },
      },
    },
    admin_boundaries: {
      type: 'boundary',
      path: copiedBoundaries.admin3!,
      opacity: 0.8,
      admin_code: 'adm3_source_id',
      admin_level_codes: ['adm1_source_id', 'adm2_source_id', 'adm3_source_id'],
      admin_level_names: ['adm1_name', 'adm2_name', 'adm3_name'],
      admin_level_local_names: ['adm1_name', 'adm2_name', 'adm3_name'],
      'styles:': {
        fill: { 'fill-opacity': 0 },
        line: { 'line-color': 'gray', 'line-width': 0.2, 'line-opacity': 0.8 },
      },
    },
  } as Record<string, any>;

  const layersWithBoundaries = { ...boundaryLayers, ...layersJson };

  fs.writeFileSync(
    path.join(countryDir, 'prism.json'),
    JSON.stringify(prismJson, null, 2),
  );

  fs.writeFileSync(path.join(countryDir, 'index.ts'), indexContent);

  fs.writeFileSync(
    path.join(countryDir, 'layers.json'),
    JSON.stringify(layersWithBoundaries, null, 2),
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
  console.log(
    '\nNote: Review boundary layer configuration in layers.json. You will likely need to adjust:',
  );
  console.log('  - admin_code');
  console.log('  - admin_level_codes');
  console.log('  - admin_level_names');
  console.log('  - admin_level_local_names');
}

async function updateMainConfig(config: SetupConfig): Promise<void> {
  const mainConfigPath = path.join(__dirname, '../src/config/index.ts');

  if (!fs.existsSync(mainConfigPath)) {
    console.log('⚠️  Main config file not found.');
    return;
  }

  let mainConfigContent = fs.readFileSync(mainConfigPath, 'utf-8');

  // Check if already added
  if (mainConfigContent.includes(`import ${config.countrySlug} from`)) {
    console.log(
      `\n✓ Country ${config.countrySlug} already exists in main config`,
    );
    return;
  }

  // Add import statement before countriesWithPreprocessedDates
  const preprocessedImportIndex = mainConfigContent.indexOf(
    'import countriesWithPreprocessedDates',
  );

  if (preprocessedImportIndex === -1) {
    console.log(
      '⚠️  Could not find countriesWithPreprocessedDates import. Skipping auto-update.',
    );
    console.log(
      `\nPlease manually add:\nimport ${config.countrySlug} from './${config.countrySlug}';`,
    );
    return;
  }

  // Insert import line
  const importLine = `import ${config.countrySlug} from './${config.countrySlug}';\n`;
  mainConfigContent =
    mainConfigContent.slice(0, preprocessedImportIndex) +
    importLine +
    mainConfigContent.slice(preprocessedImportIndex);

  // Add to configMap - find the closing bracket
  const configMapIndex = mainConfigContent.indexOf(
    'export const configMap = {',
  );
  if (configMapIndex !== -1) {
    // Find the } as const; that closes configMap
    const configMapContent = mainConfigContent.substring(configMapIndex);
    const closingBraceIndex = configMapContent.indexOf('} as const;');

    if (closingBraceIndex !== -1) {
      // Find the last entry before the closing brace
      const beforeClose = configMapContent.substring(0, closingBraceIndex);
      const lastCommaIndex = beforeClose.lastIndexOf(',');
      const indentMatch = beforeClose.substring(lastCommaIndex).match(/^(\s+)/);
      const indent = indentMatch ? indentMatch[1] : '  ';

      // Insert new entry
      const newEntry = `\n${indent}${config.countrySlug},`;
      const insertPosition = configMapIndex + lastCommaIndex + 1;

      mainConfigContent =
        mainConfigContent.slice(0, insertPosition) +
        newEntry +
        mainConfigContent.slice(insertPosition);
    }
  }

  // Write updated content
  fs.writeFileSync(mainConfigPath, mainConfigContent, 'utf-8');
  console.log(
    `\n✓ Automatically updated main config to include ${config.countrySlug}`,
  );
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
      `1. Add country-specific layers if needed in frontend/src/config/${config.countrySlug}/layers.json`,
    );
    console.log(
      `2. Upload boundary file to S3: prism-admin-boundaries/${config.boundaryFile || config.countrySlug}`,
    );
    console.log(
      `3. Set REACT_APP_COUNTRY=${config.countrySlug} environment variable`,
    );
    console.log(`4. Build and deploy`);

    // done
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
