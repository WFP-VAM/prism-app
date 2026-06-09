import {
  flattenAreaTree,
  getAdminBoundaryTree,
} from 'components/MapView/Layers/BoundaryDropdown/utils';
import type { AdminCodeString, BoundaryLayerProps } from 'config/types';
import { getBoundaryLayersByAdminLevel } from 'config/utils';
import type { LayerData } from 'context/layers/layer-data';
import type { Feature, FeatureCollection } from 'geojson';
import type i18n from 'i18next';

/** Admin area identity for schedules, alerts, and admin display. */
export type AdminAreaRef = {
  area_id: string;
  name: string;
};

export function resolveAdminAreaRefs(
  codes: AdminCodeString[],
  data: LayerData<BoundaryLayerProps>['data'] | undefined,
  layer: BoundaryLayerProps,
  i18nLocale: typeof i18n,
): AdminAreaRef[] {
  if (!data || codes.length === 0) {
    return [];
  }

  const flat = flattenAreaTree(getAdminBoundaryTree(data, layer, i18nLocale));

  return codes.map(code => {
    const entry = flat.find(area => area.adminCode === code);
    return {
      area_id: code,
      name: entry?.label ?? code,
    };
  });
}

export function formatAdminAreaRefsForDisplay(refs: AdminAreaRef[]): string {
  return refs.map(ref => ref.name).join(', ');
}

/** True when a boundary feature matches a selected admin code at any configured level. */
export function featureMatchesSelectedAdminCode(
  properties: Record<string, unknown> | null | undefined,
  layer: BoundaryLayerProps,
  code: AdminCodeString,
): boolean {
  if (!properties) {
    return false;
  }

  if (
    layer.adminLevelCodes.some(
      levelCode => String(properties[levelCode]) === code,
    )
  ) {
    return true;
  }

  const leafCode = properties[layer.adminCode];
  return String(leafCode) === code || String(leafCode).startsWith(code);
}

export function filterFeaturesBySelectedAdminCodes(
  features: Feature[],
  layer: BoundaryLayerProps,
  codes: AdminCodeString[],
): Feature[] {
  if (codes.length === 0) {
    return [];
  }

  return features.filter(feature =>
    codes.some(code =>
      featureMatchesSelectedAdminCode(
        feature.properties as Record<string, unknown>,
        layer,
        code,
      ),
    ),
  );
}

/**
 * Resolve one geometry feature per selected code at the selection's admin depth
 * (e.g. one province polygon, not every district underneath).
 */
export function resolveFeaturesForAdminCodes(
  codes: AdminCodeString[],
  treeData: LayerData<BoundaryLayerProps>['data'] | undefined,
  treeLayer: BoundaryLayerProps,
  i18nLocale: typeof i18n,
  getLayerData: (
    layerId: string,
  ) => LayerData<BoundaryLayerProps>['data'] | undefined,
): Feature[] {
  if (!treeData || codes.length === 0) {
    return [];
  }

  const flat = flattenAreaTree(
    getAdminBoundaryTree(treeData, treeLayer, i18nLocale),
  );
  const codeToLevel = new Map(
    flat.map(area => [area.adminCode, area.level] as const),
  );

  return codes.flatMap(code => {
    const level = codeToLevel.get(code);
    if (level === undefined) {
      return [];
    }

    const boundaryLayer = getBoundaryLayersByAdminLevel(level);
    const layerData = getLayerData(boundaryLayer.id);
    const feature = layerData?.features?.find(
      f => String(f.properties?.[boundaryLayer.adminCode]) === code,
    );

    return feature ? [feature] : [];
  });
}

export function buildFeatureCollectionFromFeatures(
  features: Feature[],
  template?: FeatureCollection,
): FeatureCollection {
  if (template) {
    return {
      ...template,
      features,
    };
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
