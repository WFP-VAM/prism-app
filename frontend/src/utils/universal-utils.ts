import { appConfig } from 'config';
import { BoundaryLayerProps, LayerKey } from 'config/types';
import universalMetadata from 'config/universal/metadata.json';
import { getDisplayBoundaryLayers } from 'config/utils';

type CountriesKey = keyof typeof universalMetadata.countries;

const UNIVERSAL_ADMIN3_LAYER_ID: LayerKey = 'universal_admin3_boundaries';

const ADMIN3_ISO3_CODES = new Set(
  universalMetadata.admin3Countries
    .map((code: string) => code.toUpperCase())
    .filter(code => /^[A-Z0-9]{3}$/.test(code)),
);

export function isUniversalDeployment(): boolean {
  const config = appConfig as { universal?: boolean; urlDriven?: boolean };
  return Boolean(config.universal ?? config.urlDriven);
}

export function normalizeIso3(iso3: string | undefined): string | undefined {
  if (!iso3) {
    return undefined;
  }
  return iso3.trim().toUpperCase();
}

export function isValidIso3Format(iso3: string | undefined): boolean {
  if (!iso3) {
    return false;
  }
  return /^[A-Z0-9]{3}$/.test(iso3);
}

export function isKnownIso3(iso3: string | undefined): boolean {
  const normalized = normalizeIso3(iso3);
  if (!normalized || !isValidIso3Format(normalized)) {
    return false;
  }
  return normalized in universalMetadata.countries;
}

export function hasAdmin3ForCountry(iso3: string | undefined): boolean {
  const normalized = normalizeIso3(iso3);
  if (!normalized) {
    return false;
  }
  return ADMIN3_ISO3_CODES.has(normalized);
}

export function getIso3MapFilter(iso3: string | undefined) {
  const normalized = normalizeIso3(iso3);
  if (!normalized) {
    return undefined;
  }
  return ['==', ['get', 'iso3'], normalized] as const;
}

export function filterFeaturesByIso3<
  T extends { properties?: Record<string, unknown> | null },
>(features: T[], iso3: string | undefined): T[] {
  const normalized = normalizeIso3(iso3);
  if (!normalized) {
    return features;
  }
  return features.filter(feature => feature.properties?.iso3 === normalized);
}

export function getDisplayBoundaryLayersForIso3(
  iso3?: string,
): BoundaryLayerProps[] {
  const layers = getDisplayBoundaryLayers();
  if (!isUniversalDeployment() || !iso3) {
    return layers;
  }
  if (hasAdmin3ForCountry(iso3)) {
    return layers;
  }
  return layers.filter(layer => layer.id !== UNIVERSAL_ADMIN3_LAYER_ID);
}

/** Returns the normalized ISO3 code from the URL pathname, or undefined for non-universal deployments. */
export function getIso3FromPathname(
  pathname: string = window.location.pathname,
): string | undefined {
  if (!isUniversalDeployment()) {
    return undefined;
  }
  const match = pathname.match(/\/country\/([^/]+)/i);
  return normalizeIso3(match?.[1]);
}

/** Map HDC chart field keys (dv_adm*) to universal PMTiles property keys (adm*). */
export function resolveChartBoundaryProperty(
  properties: Record<string, unknown> | null | undefined,
  chartFieldKey: string,
): unknown {
  if (!properties) {
    return undefined;
  }
  if (
    properties[chartFieldKey] !== undefined &&
    properties[chartFieldKey] !== null
  ) {
    return properties[chartFieldKey];
  }
  if (!isUniversalDeployment()) {
    return undefined;
  }
  const universalKey = chartFieldKey.replace(
    /^dv_adm(\d)_(id|name)$/,
    'adm$1_$2',
  );
  if (universalKey !== chartFieldKey) {
    return properties[universalKey];
  }
  return undefined;
}

/** Returns [minLon, minLat, maxLon, maxLat] from pre-computed metadata, or undefined. */
export function getCountryBbox(
  iso3: string | undefined,
): [number, number, number, number] | undefined {
  const normalized = normalizeIso3(iso3);
  if (!normalized || !isKnownIso3(normalized)) {
    return undefined;
  }
  const [a, b, c, d] = universalMetadata.countries[normalized as CountriesKey];
  return [a, b, c, d];
}
