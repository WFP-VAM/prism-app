import { get } from 'lodash';
import { Feature } from '@turf/helpers';
/**
 * Format full location name in ascending admin levels
 * @param layer admin layer, both props and data
 * @param featureBoundary geospatial features of the location, contains names of different admin layers
 * @returns a string containing location name in ascending admin levels i.e level 1 name, level 2 name, etc
 */

export function getFullLocationName(
  levelNames: string[],
  featureBoundary?: Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>,
): string {
  return (
    levelNames
      .map(level => get(featureBoundary, ['properties', level], '') as string)
      .join(', ') || 'No Name'
  );
}

export const MONTH_FIRST_DATE_FORMAT = 'MMM DD YYYY';
export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
export const DEFAULT_DATE_FORMAT_SNAKE_CASE = 'YYYY_MM_DD';
export const MONTH_ONLY_DATE_FORMAT = 'MMM YYYY';
