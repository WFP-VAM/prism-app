import { featureCollection } from '@turf/helpers';
import union from '@turf/union';
import type { BoundaryLayerProps } from 'config/types';
import type { LayerData } from 'context/layers/layer-data';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type i18n from 'i18next';

import { resolveFeaturesForAdminCodes } from './adminAreaSelection';

export type AdminAreaClipPolygon = Feature<Polygon | MultiPolygon>;

export function mergeAdminAreaClipFeatures(
  features: Feature[],
): AdminAreaClipPolygon | null {
  if (features.length === 0) {
    return null;
  }

  if (features.length === 1) {
    return features[0] as AdminAreaClipPolygon;
  }

  const merged = union(featureCollection(features));
  return (merged ?? features[0]) as AdminAreaClipPolygon;
}

export function buildCountryClipPolygonFromBoundaryData(
  boundaryData: LayerData<BoundaryLayerProps>['data'] | undefined,
): AdminAreaClipPolygon | null {
  if (!boundaryData?.features?.length) {
    return null;
  }

  const features = boundaryData.features.filter(
    feature => feature?.geometry?.coordinates,
  );

  return mergeAdminAreaClipFeatures(features);
}

export async function resolveAdminAreaClipPolygon(options: {
  country: string;
  selectedBoundaries: string[];
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

  if (selectedBoundaries.length > 0) {
    if (!boundaryData) {
      return null;
    }

    const fromSelection = buildAdminAreaClipPolygonFromSelection(
      selectedBoundaries,
      boundaryData,
      boundaryLayer,
      i18nLocale,
      getLayerData,
    );

    if (fromSelection) {
      return fromSelection;
    }
  }

  const fromBoundaryData =
    buildCountryClipPolygonFromBoundaryData(boundaryData);
  if (fromBoundaryData) {
    return fromBoundaryData;
  }

  try {
    return await fetchUnifiedCountryBoundaryPolygon(country);
  } catch {
    return null;
  }
}

export async function fetchUnifiedCountryBoundaryPolygon(
  country: string,
): Promise<AdminAreaClipPolygon> {
  const response = await fetch(
    `/data/${country}/admin-boundary-unified-polygon.json`,
  );
  if (!response.ok) {
    throw new Error(
      `Failed to load admin boundary polygon for ${country}: ${response.status}`,
    );
  }

  return response.json();
}

export function buildAdminAreaClipPolygonFromSelection(
  selectedBoundaries: string[],
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

  return mergeAdminAreaClipFeatures(features);
}
