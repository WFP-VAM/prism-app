import { featureCollection } from '@turf/helpers';
import union from '@turf/union';
import type { AdminCodeString, BoundaryLayerProps } from 'config/types';
import type { LayerData } from 'context/layers/layer-data';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type i18n from 'i18next';

import { resolveFeaturesForAdminCodes } from './adminAreaSelection';

export type AdminAreaClipPolygon = Feature<Polygon | MultiPolygon>;

function isPolygonOrMultiPolygonFeature(
  feature: Feature,
): feature is Feature<Polygon | MultiPolygon> {
  const geometryType = feature.geometry?.type;
  return geometryType === 'Polygon' || geometryType === 'MultiPolygon';
}

export function mergeAdminAreaClipFeatures(
  features: Feature<Polygon | MultiPolygon>[],
): AdminAreaClipPolygon | null {
  if (features.length === 0) {
    return null;
  }

  if (features.length === 1) {
    return features[0];
  }

  const merged = union(featureCollection(features));
  if (merged && isPolygonOrMultiPolygonFeature(merged)) {
    return merged;
  }

  return features[0];
}

export function buildCountryClipPolygonFromBoundaryData(
  boundaryData: LayerData<BoundaryLayerProps>['data'] | undefined,
): AdminAreaClipPolygon | null {
  if (!boundaryData?.features?.length) {
    return null;
  }

  const features = boundaryData.features.filter(isPolygonOrMultiPolygonFeature);

  return mergeAdminAreaClipFeatures(features);
}

export async function resolveAdminAreaClipPolygon(options: {
  country: string;
  selectedBoundaries: AdminCodeString[];
  boundaryData: LayerData<BoundaryLayerProps>['data'] | undefined;
  boundaryLayer: BoundaryLayerProps;
  i18nLocale: typeof i18n;
  getLayerData: (
    layerId: string,
  ) => LayerData<BoundaryLayerProps>['data'] | undefined;
}): Promise<AdminAreaClipPolygon | null> {
  const {
    country,
    selectedBoundaries,
    boundaryData,
    boundaryLayer,
    i18nLocale,
    getLayerData,
  } = options;

  const effectiveBoundaryData = boundaryData ?? getLayerData(boundaryLayer.id);

  if (selectedBoundaries.length > 0) {
    if (!effectiveBoundaryData) {
      return null;
    }

    const fromSelection = buildAdminAreaClipPolygonFromSelection(
      selectedBoundaries,
      effectiveBoundaryData,
      boundaryLayer,
      i18nLocale,
      getLayerData,
    );

    if (fromSelection) {
      return fromSelection;
    }
  }

  try {
    return await fetchUnifiedCountryBoundaryPolygon(country);
  } catch (error) {
    console.warn(
      `Unified country boundary unavailable for ${country}, falling back to boundary layer union:`,
      error,
    );
    return buildCountryClipPolygonFromBoundaryData(effectiveBoundaryData);
  }
}

const unifiedCountryBoundaryCache = new Map<
  string,
  Promise<AdminAreaClipPolygon>
>();

export async function fetchUnifiedCountryBoundaryPolygon(
  country: string,
): Promise<AdminAreaClipPolygon> {
  const cached = unifiedCountryBoundaryCache.get(country);
  if (cached) {
    return cached;
  }

  const request = (async () => {
    const response = await fetch(
      `/data/${country}/admin-boundary-unified-polygon.json`,
    );
    if (!response.ok) {
      throw new Error(
        `Failed to load admin boundary polygon for ${country}: ${response.status}`,
      );
    }

    const polygon = await response.json();
    if (!isPolygonOrMultiPolygonFeature(polygon)) {
      throw new Error(
        `Invalid admin boundary polygon for ${country}: expected Polygon or MultiPolygon`,
      );
    }

    return polygon;
  })();

  unifiedCountryBoundaryCache.set(country, request);
  request.catch(() => {
    unifiedCountryBoundaryCache.delete(country);
  });

  return request;
}

export function buildAdminAreaClipPolygonFromSelection(
  selectedBoundaries: AdminCodeString[],
  boundaryData: LayerData<BoundaryLayerProps>['data'] | undefined,
  boundaryLayer: BoundaryLayerProps,
  i18nLocale: typeof i18n,
  getLayerData: (
    layerId: string,
  ) => LayerData<BoundaryLayerProps>['data'] | undefined,
): AdminAreaClipPolygon | null {
  if (!boundaryData || selectedBoundaries.length === 0) {
    return null;
  }

  const features = resolveFeaturesForAdminCodes(
    selectedBoundaries,
    boundaryData,
    boundaryLayer,
    i18nLocale,
    getLayerData,
  );

  return mergeAdminAreaClipFeatures(
    features.filter(isPolygonOrMultiPolygonFeature),
  );
}
