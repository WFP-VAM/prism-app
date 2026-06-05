/**
 * Build-time manifest of schedule-eligible WMS layers for map export admin.
 * Mirrors the batch/scheduled map layer picker (`rawLayers` +
 * `isWmsSelectableForBatchPrint` in PrintImage).
 *
 * Output: api/prism_app/data/schedule_layer_manifest.json
 */
import fs from 'fs';
import { merge } from 'lodash';
import path from 'path';

type LayerConfig = {
  type?: string;
  title?: string;
  server_layer_name?: string;
  coverageWindow?: unknown;
  validity?: unknown;
};

type ManifestLayer = {
  id: string;
  title: string;
  server_layer_name?: string;
};

type ScheduleLayerManifest = {
  countries: Record<string, ManifestLayer[]>;
};

const CONFIG_ROOT = path.join(__dirname, '../src/config');
const MANIFEST_PATH = path.join(
  __dirname,
  '../../api/prism_app/data/schedule_layer_manifest.json',
);

/** WMS layers eligible for batch print when server dates are not loaded yet. */
function isScheduleEligibleLayer(layer: LayerConfig): boolean {
  return (
    layer.type === 'wms' && Boolean(layer.coverageWindow || layer.validity)
  );
}

/** Same merge as ``getRawLayers`` (country → shared → country; country wins). */
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
  return merge({}, countryLayers, sharedLayers, countryLayers) as Record<
    string,
    LayerConfig
  >;
}

/** Preserve ``getRawLayers`` / ``LayerDefinitions`` key order (matching frontend). */
function scheduleLayersForCountry(country: string): ManifestLayer[] {
  return Object.entries(mergedCountryLayers(country))
    .filter(([, layer]) => isScheduleEligibleLayer(layer))
    .map(([layerId, layer]) => ({
      id: layerId,
      title: layer.title || layerId,
      ...(layer.server_layer_name
        ? { server_layer_name: layer.server_layer_name }
        : {}),
    }));
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
