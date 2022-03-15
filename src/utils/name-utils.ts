import { get } from 'lodash';
import { Feature } from '@turf/helpers';
import { BoundaryLayerProps } from '../config/types';

/**
 * Format full location name in ascending admin levels
 * @param layer admin layer, both props and data
 * @param featureBoundary geospatial features of the location, contains names of different admin layers
 * @returns a string containing location name in ascending admin levels i.e level 1 name, level 2 name, etc
 */

export function getFullLocationName(
  layer: BoundaryLayerProps,
  featureBoundary?: Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>,
): string {
  return (
    layer.adminLevelNames
      .map(level => get(featureBoundary, ['properties', level], '') as string)
      .join(', ') || 'No Name'
  );
}
