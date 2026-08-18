import { appConfig } from 'config';
import { BoundaryLayerProps, LayerKey } from 'config/types';
import universalMetadata from 'config/universal/metadata.json';
import { getDisplayBoundaryLayers } from 'config/utils';
import type { Map as MaplibreMap } from 'maplibre-gl';

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

/**
 * True when the deployment's displayed boundaries are served from PMTiles
 * (Global and Universal). These load asynchronously in the map, so they need
 * the boundary loading overlay on first render and explicit preloading before
 * clip/export. GeoJSON-boundary country deployments (e.g. Mozambique) do not.
 */
export function usesPmtilesBoundaries(): boolean {
  return getDisplayBoundaryLayers().some(layer => layer.format === 'pmtiles');
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

export type UniversalLandingView = {
  bounds: [number, number, number, number];
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};

/** Shift the globe into the map area to the right of the country list. */
export function applyUniversalLandingViewport(
  map: MaplibreMap,
  options?: { animate?: boolean; duration?: number },
): void {
  const landingView = getUniversalLandingView();
  if (!landingView) {
    return;
  }

  const { animate = false, duration = 0 } = options ?? {};
  map.setPadding(landingView.padding);

  const [minLon, minLat, maxLon, maxLat] = landingView.bounds;
  map.fitBounds(
    [
      [minLon, minLat],
      [maxLon, maxLat],
    ],
    {
      padding: landingView.padding,
      animate,
      duration,
    },
  );
}

/**
 * Initial / return-to-landing map viewport when prism.json defines map.landingView.
 * Used by Universal (landing) and Global (initial load).
 */
export function getUniversalLandingView(): UniversalLandingView | undefined {
  const landingView = (appConfig.map as { landingView?: UniversalLandingView })
    .landingView;

  if (
    !landingView?.bounds ||
    landingView.bounds.length !== 4 ||
    !landingView.padding
  ) {
    return undefined;
  }

  return landingView;
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

type UniversalMetadataWithNames = typeof universalMetadata & {
  countryNames?: Record<string, string>;
};

/** Complete country list from static metadata (viewport-independent). */
export function getUniversalCountries(): UniversalCountryOption[] {
  const countryNames =
    (universalMetadata as UniversalMetadataWithNames).countryNames ?? {};

  return Object.keys(universalMetadata.countries)
    .filter(iso3 => !iso3.startsWith('x'))
    .map(iso3 => ({
      iso3,
      name: countryNames[iso3]?.trim() || iso3,
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
  const trimmed = iso3?.trim();
  if (!trimmed) {
    return undefined;
  }
  // Preserve pseudo-country keys such as "xAB"; uppercasing them would make
  // them impossible to resolve from metadata.
  const key = (
    trimmed in universalMetadata.countries ? trimmed : normalizeIso3(trimmed)
  ) as CountriesKey | undefined;
  if (!key || !(key in universalMetadata.countries)) {
    return undefined;
  }
  const [a, b, c, d] = universalMetadata.countries[key];
  return [a, b, c, d];
}
