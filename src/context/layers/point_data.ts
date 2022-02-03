import { camelCase } from 'lodash';
import GeoJSON from 'geojson';
import moment from 'moment';
import type { LazyLoader } from './layer-data';
import { PointDataLayerProps } from '../../config/types';

declare module 'geojson' {
  export const version: string;
  export const defaults: object;

  export function parse(
    data: object,
    properties: object,
    callback?: Function,
  ): PointLayerData;
}

export type PointLayerData = {
  lat: number;
  lon: number;
  date: number; // in unix time.
  [key: string]: any;
}[];

export const queryParamsToString = (queryParams?: {
  [key: string]: string | { [key: string]: string };
}): string =>
  queryParams
    ? Object.entries(queryParams)
        .map(([key, value]) => {
          if (key === 'filters') {
            const filterValues = Object.entries(value)
              .map(([filterKey, filterValue]) => `${filterKey}=${filterValue}`)
              .join(',');

            return `filters=${filterValues}`;
          }
          return `${camelCase(key)}=${value}`;
        })
        .join('&')
    : '';

const getDatesFromCalendar = (
  momentDate: moment.Moment,
  availableDates: number[],
): [string, string] => {
  const startDate = momentDate.format('YYYY-MM-DD');

  const endDateNumber =
    availableDates[availableDates.findIndex(l => l > momentDate.valueOf())];

  const endDate = moment(endDateNumber).format('YYYY-MM-DD');

  return [startDate, endDate];
};

const getDatesFromDaysPeriod = (
  momentDate: moment.Moment,
  daysPeriod: number,
): [string, string] => {
  const startDate = momentDate
    .clone()
    .subtract(daysPeriod, 'days')
    .format('YYYY-MM-DD');
  const endDate = momentDate
    .clone()
    .add(daysPeriod, 'days')
    .format('YYYY-MM-DD');

  return [startDate, endDate];
};

const getDatesWithoutValidityDays = (
  momentDate: moment.Moment,
): [string, string] => {
  const dateStr = momentDate.format('YYYY-MM-DD');

  return [dateStr, dateStr];
};

const getDates = (
  momentDate: moment.Moment,
  availableDates?: number[],
  validityDays?: number | 'calendar',
): [string, string] => {
  if (!validityDays || !availableDates) {
    return getDatesWithoutValidityDays(momentDate);
  }

  if (validityDays === 'calendar') {
    return getDatesFromCalendar(momentDate, availableDates);
  }
  return getDatesFromDaysPeriod(momentDate, validityDays);
};

export const fetchPointLayerData: LazyLoader<PointDataLayerProps> = () => async ({
  date,
  layer: { data: dataUrl, fallbackData, additionalQueryParams, validityDays },
  availableDates,
}) => {
  // This function fetches point data from the API.
  // If this endpoint is not available or we run into an error,
  // we should get the data from the local public file in layer.fallbackData

  const momentDate = moment(date);

  const [startDate, endDate] = date
    ? ['2000-01-01', '2023-12-21']
    : getDates(momentDate, availableDates, validityDays);

  // TODO exclusive to this api...
  const dateQuery = `beginDateTime=${startDate}&endDateTime=${endDate}`;

  const requestUrl = `${dataUrl}${
    dataUrl.includes('?') ? '&' : '?'
  }${dateQuery}&${queryParamsToString(additionalQueryParams)}`;

  let data;
  try {
    // eslint-disable-next-line fp/no-mutation
    data = (await (
      await fetch(requestUrl, {
        mode: 'cors',
      })
    ).json()) as PointLayerData;
  } catch (ignored) {
    // fallback data isn't filtered, therefore we must filter it.
    // eslint-disable-next-line fp/no-mutation
    data = ((await (
      await fetch(fallbackData || '')
    ).json()) as PointLayerData).filter(
      // we cant do a string comparison here because sometimes the date in json is stored as YYYY-M-D instead of YYYY-MM-DD
      // using moment here helps compensate for these discrepancies
      obj =>
        moment(obj.date).format('YYYY-MM-DD') ===
        momentDate.format('YYYY-MM-DD'),
    );
  }
  return GeoJSON.parse(data, { Point: ['lat', 'lon'] });
};
