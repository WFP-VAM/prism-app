import { GeoJSON } from 'geojson';
import { TFunction as _TFunction } from 'i18next';
import { isNumber } from 'lodash';
import { TableRowType } from 'context/tableStateSlice';
import { i18nTranslator } from 'i18n';
import { AggregationOperations, units } from 'config/types';

export type TFunction = _TFunction;

export function getRoundedData(
  data: number | string | null,
  t?: i18nTranslator,
  decimals: number = 3,
  statistic?: AggregationOperations | string,
): string {
  /* eslint-disable fp/no-mutation */
  let result = data;
  if (isNumber(result) && Number.isNaN(result)) {
    return '-';
  }
  if (statistic === AggregationOperations['Area exposed']) {
    result = 100 * (Number(result) || 0);
  }
  if (isNumber(result)) {
    result = parseFloat(result.toFixed(decimals)).toLocaleString();
  } else {
    // TODO - investigate why we received string 'null' values in data.
    result = result && result !== 'null' ? result : 'No Data';
    /* eslint-enable fp/no-mutation */
  }
  const unit = statistic && units[statistic];
  return `${t ? t(result) : result} ${unit || ''}`;
}

export function getTableCellVal(
  rowData: TableRowType | undefined,
  column: string,
  t: TFunction,
) {
  const colValue = rowData ? rowData[column] : column;
  const formattedColValue = isNumber(colValue)
    ? getRoundedData(colValue, t)
    : t(colValue).toLocaleString();
  return formattedColValue;
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
