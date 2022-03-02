import { get } from 'lodash';
import { BoundaryLayerProps } from '../config/types';

export function getLocationName(
  layer: BoundaryLayerProps,
  featureBoundary: any,
): string {
  return (
    layer.adminLevelNames
      .map(level => get(featureBoundary, ['properties', level], '') as string)
      .join(', ') || 'No Name'
  );
}
