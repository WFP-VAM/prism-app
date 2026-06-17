/**
 * Validates PMTiles boundary layers declared in country configs:
 * - Archive URL is reachable (getHeader)
 * - Expected source layer (layer_name) exists in tile metadata
 * - Declared admin property keys exist in that layer's fields
 */
import fs from 'fs';
import path from 'path';
import { PMTiles } from 'pmtiles';

export interface RawPmtilesBoundaryLayer {
  configCountry: string;
  layerId: string;
  path: string;
  layer_name: string;
  admin_level_codes: string[];
  admin_level_names: string[];
  admin_level_local_names: string[];
}

export interface VectorLayerMeta {
  id: string;
  fields?: Record<string, string>;
}

export interface PmtilesMetadata {
  vector_layers?: VectorLayerMeta[];
}

export function collectPmtilesLayers(
  configDir: string,
): RawPmtilesBoundaryLayer[] {
  const layers: RawPmtilesBoundaryLayer[] = [];
  const countryDirs = fs
    .readdirSync(configDir)
    .filter(file => fs.statSync(path.join(configDir, file)).isDirectory())
    .sort((a, b) => a.localeCompare(b));

  countryDirs.forEach(country => {
    const layersPath = path.join(configDir, country, 'layers.json');
    if (!fs.existsSync(layersPath)) {
      return;
    }
    const layersData = JSON.parse(
      fs.readFileSync(layersPath, 'utf-8'),
    ) as Record<
      string,
      {
        type?: string;
        format?: string;
        path?: string;
        layer_name?: string;
        admin_level_codes?: string[];
        admin_level_names?: string[];
        admin_level_local_names?: string[];
      }
    >;

    Object.entries(layersData).forEach(([layerId, layer]) => {
      if (
        layer.type === 'boundary' &&
        layer.format === 'pmtiles' &&
        layer.path &&
        layer.layer_name
      ) {
        layers.push({
          configCountry: country,
          layerId,
          path: layer.path,
          layer_name: layer.layer_name,
          admin_level_codes: layer.admin_level_codes ?? [],
          admin_level_names: layer.admin_level_names ?? [],
          admin_level_local_names: layer.admin_level_local_names ?? [],
        });
      }
    });
  });

  return layers;
}

export function getRequiredPropertyKeys(
  layer: RawPmtilesBoundaryLayer,
): string[] {
  const keys = [
    ...layer.admin_level_codes,
    ...layer.admin_level_names,
    ...layer.admin_level_local_names,
  ];
  if (layer.configCountry === 'universal') {
    keys.push(...getUniversalHdcChartPropertyKeys(layer));
  }
  return keys;
}

/** HDC chart id keys expected on universal PMTiles (one per admin level). */
export function getUniversalHdcChartPropertyKeys(
  layer: RawPmtilesBoundaryLayer,
): string[] {
  // Admin 3 tiles are map-only; charts/analysis stop at admin 2.
  if (layer.layer_name === 'admin3') {
    return [];
  }
  const levelCount = layer.admin_level_codes.length;
  const keys: string[] = [];
  for (let level = 0; level < levelCount; level += 1) {
    keys.push(`dv_adm${level}_id`);
  }
  return keys;
}

export function validateLayerAgainstMetadata(
  layer: RawPmtilesBoundaryLayer,
  metadata: PmtilesMetadata,
): string[] {
  const errors: string[] = [];
  const vectorLayers = metadata.vector_layers ?? [];
  const sourceLayer = vectorLayers.find(v => v.id === layer.layer_name);

  if (!sourceLayer) {
    const available = vectorLayers.map(v => v.id).join(', ') || '(none)';
    errors.push(
      `${layer.configCountry}/${layer.layerId}: source layer "${layer.layer_name}" not found in PMTiles metadata (available: ${available})`,
    );
    return errors;
  }

  const fields = sourceLayer.fields ?? {};
  const requiredKeys = getRequiredPropertyKeys(layer);
  requiredKeys.forEach(key => {
    if (!(key in fields)) {
      errors.push(
        `${layer.configCountry}/${layer.layerId}: property "${key}" missing from PMTiles layer "${layer.layer_name}" fields`,
      );
    }
  });

  return errors;
}

export interface PmtilesClient {
  getHeader: () => Promise<unknown>;
  getMetadata: () => Promise<unknown>;
}

export async function validatePmtilesUrl(
  url: string,
  layers: RawPmtilesBoundaryLayer[],
  createInstance: (u: string) => PmtilesClient = u =>
    new PMTiles(u) as PmtilesClient,
): Promise<string[]> {
  const errors: string[] = [];

  try {
    const pmtiles = createInstance(url);
    await pmtiles.getHeader();
    const metadata = (await pmtiles.getMetadata()) as PmtilesMetadata;
    layers.forEach(layer => {
      errors.push(...validateLayerAgainstMetadata(layer, metadata));
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(
      `PMTiles archive unreachable at ${url}: ${message} (layers: ${layers.map(l => `${l.configCountry}/${l.layerId}`).join(', ')})`,
    );
  }

  return errors;
}

async function main() {
  const configDir = path.join(__dirname, '../src/config');
  const allLayers = collectPmtilesLayers(configDir);

  if (allLayers.length === 0) {
    console.error('No PMTiles boundary layers found in config.');
    return;
  }

  const byUrl = new Map<string, RawPmtilesBoundaryLayer[]>();
  allLayers.forEach(layer => {
    const existing = byUrl.get(layer.path) ?? [];
    existing.push(layer);
    byUrl.set(layer.path, existing);
  });

  const allErrors: string[] = [];
  for (const [url, layers] of byUrl.entries()) {
    // eslint-disable-next-line no-console
    console.info(
      `Validating PMTiles: ${url} (${layers.length} layer config(s))`,
    );
    const urlErrors = await validatePmtilesUrl(url, layers);
    allErrors.push(...urlErrors);
  }

  if (allErrors.length > 0) {
    console.error('PMTiles validation failed:');
    allErrors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.info(
    `PMTiles validation passed (${byUrl.size} archive(s), ${allLayers.length} layer config(s)).`,
  );
}

if (require.main === module) {
  main();
}
