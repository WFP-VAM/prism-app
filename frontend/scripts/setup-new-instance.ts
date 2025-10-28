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
  kh: 'Khmer',
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
    'Enter WMS server URLs (comma-separated, or press Enter for default, https://api.earthobservation.vam.wfp.org/ows/wms): ',
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

  // 7. Boundary files (paths)
  console.log('\n--- Boundary Files ---');
  console.log(
    'Provide paths to admin boundary files. If left empty, Mozambique defaults are used temporarily.',
  );
  const admin1Path = await question(
    'Path to admin1 boundary file (e.g., /abs/path/adm1.json), or Enter to skip: ',
  );
  const admin2Path = await question(
    'Path to admin2 boundary file (e.g., /abs/path/adm2.json), or Enter to skip: ',
  );
  const admin3Path = await question(
    'Path to admin3 boundary file (e.g., /abs/path/adm3.json), or Enter to skip: ',
  );
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
  console.log(
    'Available boundary layers:\n  admin0 (country level)\n  admin1 (province/state)\n  admin2 (district)\n  admin3 (sub-district)',
  );
  const boundariesInput = await question(
    'Enter boundary layers to display by default (comma-separated, e.g., "admin1,admin2", or press Enter for admin1,admin2): ',
  );
  const defaultDisplayBoundaries = boundariesInput.trim()
    ? boundariesInput
        .split(',')
        .map(b => b.trim())
        .filter(Boolean)
        .map(b => `${b}_boundaries`)
    : ['admin1_boundaries', 'admin2_boundaries'];

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
