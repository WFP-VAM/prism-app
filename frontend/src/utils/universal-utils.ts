import { appConfig } from 'config';
import { BoundaryLayerProps, LayerKey } from 'config/types';
import universalMetadata from 'config/universal/metadata.json';
import { getDisplayBoundaryLayers } from 'config/utils';

type CountriesKey = keyof typeof universalMetadata.countries;

const UNIVERSAL_ADMIN0_LAYER_ID: LayerKey = 'universal_admin0_boundaries';
const UNIVERSAL_ADMIN3_LAYER_ID: LayerKey = 'universal_admin3_boundaries';

const ISO3_CODE_REGEX = /^[A-Z0-9]{3}$/;

const ADMIN3_ISO3_CODES = new Set(
  universalMetadata.admin3Countries
    .map((code: string) => code.toUpperCase())
    .filter(code => ISO3_CODE_REGEX.test(code)),
);

export function isUniversalDeployment(): boolean {
  const config = appConfig as { universal?: boolean; urlDriven?: boolean };
  return Boolean(config.universal ?? config.urlDriven);
}

export function normalizeIso3(iso3: string | undefined): string | undefined {
  return iso3?.trim().toUpperCase();
}

export function isValidIso3Format(iso3: string | undefined): boolean {
  return iso3 ? ISO3_CODE_REGEX.test(iso3) : false;
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
  return normalized ? ADMIN3_ISO3_CODES.has(normalized) : false;
}

export function getIso3MapFilter(iso3: string | undefined) {
  const normalized = normalizeIso3(iso3);
  return normalized
    ? (['==', ['get', 'iso3'], normalized] as const)
    : undefined;
}

/** Landing map should hide pseudo-countries whose raw iso3 starts with lowercase "x". */
export function getUniversalAdmin0LandingFilter() {
  return ['!=', ['slice', ['get', 'iso3'], 0, 1], 'x'] as const;
}

export function filterFeaturesByIso3<
  T extends { properties?: Record<string, unknown> | null },
>(features: T[], iso3: string | undefined): T[] {
  const normalized = normalizeIso3(iso3);
  return normalized
    ? features.filter(feature => feature.properties?.iso3 === normalized)
    : features;
}

export function isUniversalLandingMode(iso3?: string): boolean {
  return isUniversalDeployment() && !iso3;
}

export function getDisplayBoundaryLayersForIso3(
  iso3?: string,
): BoundaryLayerProps[] {
  const layers = getDisplayBoundaryLayers();
  if (!isUniversalDeployment()) {
    return layers;
  }
  if (!iso3) {
    return layers.filter(layer => layer.id === UNIVERSAL_ADMIN0_LAYER_ID);
  }
  if (hasAdmin3ForCountry(iso3)) {
    return layers;
  }
  return layers.filter(layer => layer.id !== UNIVERSAL_ADMIN3_LAYER_ID);
}

export type UniversalCountryOption = {
  iso3: string;
  name: string;
};

export function getCountriesFromAdmin0Features(
  features: { properties?: Record<string, unknown> | null }[] | undefined,
): UniversalCountryOption[] {
  if (!features?.length) {
    return [];
  }

  const countriesByIso3 = new Map<string, string>();
  features.forEach(feature => {
    const rawIso3 = String(feature.properties?.iso3 ?? '');
    if (rawIso3.startsWith('x')) {
      return;
    }
    const iso3 = normalizeIso3(rawIso3);
    const name = String(feature.properties?.adm0_name ?? '').trim();
    if (!iso3 || !name || countriesByIso3.has(iso3)) {
      return;
    }
    countriesByIso3.set(iso3, name);
  });

  return Array.from(countriesByIso3.entries())
    .map(([countryIso3, countryName]) => ({
      iso3: countryIso3,
      name: countryName,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
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

/**
 * Resolve HDC chart field keys (dv_adm{N}_id / dv_adm{N}_name) from boundary
 * feature properties. dv_adm{N}_id is the authoritative HDC id_code; GAUL
 * adm{N}_id is never substituted. For display names only, universal PMTiles
 * may fall back to adm{N}_name when dv_adm{N}_name is absent.
 */
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
  const nameFallbackKey = chartFieldKey.replace(
    /^dv_adm(\d)_name$/,
    'adm$1_name',
  );
  if (nameFallbackKey !== chartFieldKey) {
    return properties[nameFallbackKey];
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
