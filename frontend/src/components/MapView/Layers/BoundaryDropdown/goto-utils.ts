import bbox from '@turf/bbox';
import { BoundaryLayerProps, LayerKey } from 'config/types';
import { BoundaryLayerData } from 'context/layers/boundary';
import { BBox } from 'geojson';
import { adminCodesEqual } from 'utils/adminAreaCodes';
import { getCountryBbox } from 'utils/universal-utils';

import { FlattenedAdminBoundary } from './utils';

type BoundaryDataByLayerId = Record<LayerKey, BoundaryLayerData | undefined>;

function isFiniteBbox(
  bounds: BBox,
): bounds is [number, number, number, number] {
  return bounds.length === 4 && bounds.every(Number.isFinite);
}

/**
 * Resolve the extent for a Go To menu item without treating numeric admin
 * codes as hierarchical string prefixes.
 */
export function getGoToBounds(
  area: FlattenedAdminBoundary,
  treeLayer: BoundaryLayerProps,
  boundaryLayers: BoundaryLayerProps[],
  boundaryData: BoundaryDataByLayerId,
): [number, number, number, number] | undefined {
  if (area.level === 1 && area.iso3) {
    const countryBounds = getCountryBbox(area.iso3);
    if (countryBounds) {
      return countryBounds;
    }
  }

  const codeProperty = treeLayer.adminLevelCodes[area.level - 1];
  const boundaryLayer = boundaryLayers.find(
    layer => layer.adminCode === codeProperty,
  );
  if (!boundaryLayer) {
    return undefined;
  }

  const features = (boundaryData[boundaryLayer.id]?.features ?? []).filter(
    feature =>
      adminCodesEqual(
        feature.properties?.[boundaryLayer.adminCode],
        area.adminCode,
      ),
  );
  if (features.length === 0) {
    return undefined;
  }

  const bounds = bbox({
    type: 'FeatureCollection',
    features,
  });
  return isFiniteBbox(bounds) ? bounds : undefined;
}
