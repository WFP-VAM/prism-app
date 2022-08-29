import { GeoJSON } from 'geojson';
import { isNumber } from 'lodash';
import { i18nTranslator } from '../i18n';

export function getRoundedData(
  data: number | null,
  t?: i18nTranslator,
  decimals: number = 3,
): string {
  if (isNumber(data)) {
    return parseFloat(data.toFixed(decimals)).toLocaleString();
  }
  const dataString = data && data !== 'null' ? data : 'No Data';
  return t ? t(dataString) : dataString;
}

// get the first coordinate in a GeoJSON
export function coordFirst(data: GeoJSON): number[] {
  if (data.type === 'FeatureCollection') {
    return coordFirst(data.features[0].geometry);
  }
  if (data.type === 'Feature') {
    return coordFirst(data.geometry);
  }
  if (data.type === 'GeometryCollection') {
    return coordFirst(data.geometries[0]);
  }
  if (data.type === 'MultiPolygon') {
    return data.coordinates[0][0][0];
  }
  if (data.type === 'Polygon') {
    return data.coordinates[0][0];
  }
  throw new Error(
    'you called coordFirst on data that is not a GeoJSON or GeoJSON Geometry',
  );
}

// check if a date is in a list of given available date (ignoring times)
export function getDateFromList(
  checkingDate: Date | null,
  availableDates: Date[],
): Date | null {
  if (availableDates.length === 0) {
    return null;
  }
  if (!checkingDate) {
    return availableDates[availableDates.length - 1];
  }
  const foundDate = availableDates.find(
    date => date.toDateString() === checkingDate.toDateString(),
  );
  return foundDate || availableDates[availableDates.length - 1];
}
