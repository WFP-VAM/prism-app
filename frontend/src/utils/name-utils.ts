import { get } from 'lodash';
/**
 * Format full location name in ascending admin levels
 * @param layer admin layer, both props and data
 * @param featureBoundary geospatial features of the location, contains names of different admin layers
 * @returns a string containing location name in ascending admin levels i.e level 1 name, level 2 name, etc
 */

export function getFullLocationName(
  levelNames: string[],
  featureBoundary?: GeoJSON.Feature<
    GeoJSON.Geometry,
    GeoJSON.GeoJsonProperties
  >,
): string {
  return (
    levelNames
      .map(level => get(featureBoundary, ['properties', level], '') as string)
      .join(', ') || 'No Name'
  );
}

export enum DateFormat {
  MonthFirst = 'MMM dd yyyy',
  Default = 'YYYY-MM-DD',
  DefaultSnakeCase = 'YYYY_MM_DD',
  ShortMonth = 'MMM',
  ShortMonthYear = 'MMM yyyy',
  MonthYear = 'MMMM yyyy',
  ISO = 'YYYY-MM-DDTHH:mm:ss',
  DateTime = 'YYYY-MM-DD HH:mm',
  DayFirstSnakeCase = 'DD_MM_YYYY',
  MiddleEndian = 'MM/DD/YYYY',
  TimeOnly = 'HH:mm',
  DayFirstHyphen = 'DD-MM-YYYY',
}
