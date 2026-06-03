/**
 * Build-time manifest of schedule-eligible WMS layers for map export admin.
 * All WMS layers per country (batch print may also use server-loaded dates).
 *
 * Output: api/prism_app/data/schedule_layer_manifest.json
 */
import fs from 'fs';
import path from 'path';

type LayerConfig = {
  type?: string;
  title?: string;
  coverageWindow?: unknown;
  validity?: unknown;
};

type ManifestLayer = {
  id: string;
  title: string;
};

type ScheduleLayerManifest = {
  countries: Record<string, ManifestLayer[]>;
};

const CONFIG_ROOT = path.join(__dirname, '../src/config');
const MANIFEST_PATH = path.join(
  __dirname,
  '../../api/prism_app/data/schedule_layer_manifest.json',
);

/** All WMS hazard layers for a country (batch print may use server dates when config has none). */
function isScheduleEligibleLayer(layer: LayerConfig): boolean {
  return layer.type === 'wms';
}

/** Merge shared + country layers; country keys win (see ``getRawLayers`` / backend catalog). */
function mergedCountryLayers(country: string): Record<string, LayerConfig> {
  const countryPath = path.join(CONFIG_ROOT, country, 'layers.json');
  const sharedPath = path.join(CONFIG_ROOT, 'shared', 'layers.json');
  const countryLayers = JSON.parse(
    fs.readFileSync(countryPath, 'utf-8'),
  ) as Record<string, LayerConfig>;
  const sharedLayers = fs.existsSync(sharedPath)
    ? (JSON.parse(fs.readFileSync(sharedPath, 'utf-8')) as Record<
        string,
        LayerConfig
      >)
    : {};
  const merged = { ...sharedLayers, ...countryLayers };
  return Object.fromEntries(
    Object.keys(countryLayers)
      .filter(layerId => layerId in merged)
      .map(layerId => [layerId, merged[layerId]]),
  );
}

function scheduleLayersForCountry(country: string): ManifestLayer[] {
  return Object.entries(mergedCountryLayers(country))
    .filter(([, layer]) => isScheduleEligibleLayer(layer))
    .map(([layerId, layer]) => ({
      id: layerId,
      title: layer.title || layerId,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

const countryDirs = fs
  .readdirSync(CONFIG_ROOT)
  .filter(
    file =>
      file !== 'shared' &&
      fs.statSync(path.join(CONFIG_ROOT, file)).isDirectory() &&
      fs.existsSync(path.join(CONFIG_ROOT, file, 'layers.json')),
  )
  .sort((a, b) => a.localeCompare(b));

const manifest: ScheduleLayerManifest = {
  countries: Object.fromEntries(
    countryDirs.map(country => [country, scheduleLayersForCountry(country)]),
  ),
};

fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
fs.writeFileSync(`${MANIFEST_PATH}`, `${JSON.stringify(manifest, null, 2)}\n`);
