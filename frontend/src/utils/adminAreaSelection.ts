import {
  flattenAreaTree,
  getAdminBoundaryTree,
} from 'components/MapView/Layers/BoundaryDropdown/utils';
import type {
  AdminCodeString,
  AdminLevelType,
  BoundaryLayerProps,
} from 'config/types';
import { getBoundaryLayers, getBoundaryLayersByAdminLevel } from 'config/utils';
import type { LayerData } from 'context/layers/layer-data';
import type { Feature, FeatureCollection } from 'geojson';
import type i18n from 'i18next';

import { adminCodesEqual, normalizeAdminCode } from './adminAreaCodes';

export { adminCodesEqual, normalizeAdminCode } from './adminAreaCodes';

/** Admin area identity for schedules, alerts, and admin display. */
export type AdminAreaRef = {
  area_id: string;
  name: string;
};

/** Map a tree depth to the boundary layer file that owns that admin level. */
export function getBoundaryLayerForTreeLevel(
  treeLayer: BoundaryLayerProps,
  treeLevel: AdminLevelType,
): BoundaryLayerProps {
  const levelIndex = treeLevel - 1;
  if (levelIndex >= 0 && levelIndex < treeLayer.adminLevelCodes.length) {
    const codeProperty = treeLayer.adminLevelCodes[levelIndex];
    const matchingLayer = getBoundaryLayers().find(
      layer => layer.adminCode === codeProperty,
    );
    if (matchingLayer) {
      return matchingLayer;
    }
  }

  return getBoundaryLayersByAdminLevel(treeLevel);
}

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
    const entry = flat.find(area => adminCodesEqual(area.adminCode, code));
    return {
      area_id: normalizeAdminCode(code) ?? code,
      name: entry?.label ?? String(code),
    };
  });
}

export function formatAdminAreaRefsForDisplay(refs: AdminAreaRef[]): string {
  return refs.map(ref => ref.name).join(', ');
}

/** Mirror ``sanitize_filename_part`` in ``api/prism_app/export_jobs/download_filename.py``. */
export function sanitizeFilenamePart(value: string): string {
  let sanitized = value
    .trim()
    .split('')
    .map(ch => {
      const code = ch.charCodeAt(0);
      if (code < 32 || code === 127 || ch === ' ' || /[<>:"/\\|?*]/.test(ch)) {
        return '_';
      }
      return ch;
    })
    .join('');

  while (sanitized.includes('__')) {
    sanitized = sanitized.replace(/__/g, '_');
  }

  return sanitized.replace(/^_+|_+$/g, '');
}

/** Underscore-joined admin names for export filenames (e.g. ``Cabo_Delgado``). */
export function adminAreaFilenameSegment(
  refs: AdminAreaRef[],
): string | undefined {
  const parts = refs
    .map(ref => sanitizeFilenamePart(ref.name))
    .filter(part => part.length > 0);

  return parts.length > 0 ? parts.join('_') : undefined;
}

export function buildCountryAdminFilenameStem(
  country: string,
  adminAreaRefs: AdminAreaRef[],
): string | undefined {
  const safeCountry = sanitizeFilenamePart(country);
  const areaSegment = adminAreaFilenameSegment(adminAreaRefs);
  if (!safeCountry || !areaSegment) {
    return undefined;
  }

  return `${safeCountry}_${areaSegment}`;
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
    layer.adminLevelCodes.some(levelCode =>
      adminCodesEqual(properties[levelCode], code),
    )
  ) {
    return true;
  }

  const leafCode = properties[layer.adminCode];
  const normalizedCode = normalizeAdminCode(code);
  if (normalizedCode === null) {
    return false;
  }

  const normalizedLeaf = normalizeAdminCode(leafCode);
  return (
    normalizedLeaf === normalizedCode ||
    (normalizedLeaf !== null && normalizedLeaf.startsWith(normalizedCode))
  );
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
  const codeToLevel = new Map<AdminCodeString, AdminLevelType>(
    flat.flatMap(area => {
      const normalizedCode = normalizeAdminCode(area.adminCode);
      return normalizedCode ? [[normalizedCode, area.level] as const] : [];
    }),
  );

  return codes.flatMap(code => {
    const normalizedCode = normalizeAdminCode(code);
    if (normalizedCode === null) {
      return [];
    }

    const level = codeToLevel.get(normalizedCode);
    if (level === undefined) {
      return [];
    }

    const boundaryLayer = getBoundaryLayerForTreeLevel(treeLayer, level);
    const layerData = getLayerData(boundaryLayer.id);
    const feature = layerData?.features?.find(f =>
      adminCodesEqual(f.properties?.[boundaryLayer.adminCode], normalizedCode),
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
