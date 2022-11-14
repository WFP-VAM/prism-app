import { camelCase } from 'lodash';
import GeoJSON from 'geojson';
import moment from 'moment';
import type { LazyLoader } from './layer-data';
import {
  PointDataLayerProps,
  PointDataLoader,
  PointData,
} from '../../config/types';
import { DEFAULT_DATE_FORMAT } from '../../utils/name-utils';
import { fetchEWSData } from '../../utils/ews-utils';
import { getAdminLevelDataLayerData } from './admin_level_data';

declare module 'geojson' {
  export const version: string;
  export const defaults: object;

  export function parse(
    data: object,
    properties: object,
    callback?: Function,
  ): PointData[];
}

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

export const fetchPointLayerData: LazyLoader<PointDataLayerProps> = () => async (
  {
    userAuth,
    date,
    layer: {
      data: dataUrl,
      fallbackData,
      additionalQueryParams,
      adminLevelDisplay,
      boundary,
      dataField,
      featureInfoProps,
      loader,
      authRequired,
    },
  },
  { getState },
) => {
  // This function fetches point data from the API.
  // If this endpoint is not available or we run into an error,
  // we should get the data from the local public file in layer.fallbackData

  if (date) {
    switch (loader) {
      case PointDataLoader.EWS:
        return fetchEWSData(dataUrl, date);
      default:
        break;
    }
  }

  const formattedDate = date && moment(date).format(DEFAULT_DATE_FORMAT);

  // TODO exclusive to this api...
  const dateQuery = `beginDateTime=${
    formattedDate || '2000-01-01'
  }&endDateTime=${formattedDate || '2023-12-21'}`;

  const requestUrl = `${dataUrl}${
    dataUrl.includes('?') ? '&' : '?'
  }${dateQuery}&${queryParamsToString(additionalQueryParams)}`;

  const headers = authRequired
    ? {
        Authorization: `Basic ${btoa(
          `${userAuth.username}:${userAuth.password}`,
        )}`,
      }
    : undefined;

  let data;
  let response: Response;
  // TODO - Better error handling, esp. for unauthorized requests.
  try {
    // eslint-disable-next-line fp/no-mutation
    response = await fetch(requestUrl, {
      mode: 'cors',
      headers,
    });
    // eslint-disable-next-line fp/no-mutation
    data = (await response.json()) as PointData[];
  } catch (ignored) {
    // fallback data isn't filtered, therefore we must filter it.
    // eslint-disable-next-line fp/no-mutation
    response = await fetch(fallbackData || '');
    // eslint-disable-next-line fp/no-mutation
    data = ((await response.json()) as PointData[]).filter(
      // we cant do a string comparison here because sometimes the date in json is stored as YYYY-M-D instead of YYYY-MM-DD
      // using moment here helps compensate for these discrepancies
      obj =>
        moment(obj.date).format(DEFAULT_DATE_FORMAT) ===
        moment(formattedDate).format(DEFAULT_DATE_FORMAT),
    );
  }

  if (response.status > 299) {
    throw new Error((data as any)?.detail);
  }

  if (adminLevelDisplay && !Object.keys(data).includes('message')) {
    const { adminCode } = adminLevelDisplay;

    return getAdminLevelDataLayerData(
      data,
      {
        boundary,
        adminCode,
        dataField,
        featureInfoProps,
      },
      getState,
    );
  }
  return { features: GeoJSON.parse(data, { Point: ['lat', 'lon'] }) };
};
