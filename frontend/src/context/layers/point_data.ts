import GeoJSON from 'geojson';
import {
  PointDataLayerProps,
  PointDataLoader,
  PointData,
  PointLayerData,
} from 'config/types';
import { fetchEWSData } from 'utils/ews-utils';
import { fetchACLEDIncidents } from 'utils/acled-utils';
import { queryParamsToString } from 'utils/url-utils';
import { fetchWithTimeout } from 'utils/fetch-with-timeout';
import { HTTPError } from 'utils/error-utils';
import { setUserAuthGlobal } from 'context/serverStateSlice';
import { getFormattedDate } from 'utils/date-utils';
import { getAdminLevelDataLayerData } from './admin_level_data';
import type { LazyLoader } from './layer-data';

declare module 'geojson' {
  export const version: string;
  export const defaults: object;

  export function parse(
    data: object,
    properties: object,
    callback?: Function,
  ): PointData[];
}

const GOOGLE_FLOOD_REQUEST_TIMEOUT = 60000;

export const fetchPointLayerData: LazyLoader<PointDataLayerProps> =
  () =>
  async (
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
    { dispatch },
  ) => {
    // This function fetches point data from the API.
    // If this endpoint is not available or we run into an error,
    // we should get the data from the local public file in layer.fallbackData
    if (date) {
      switch (loader) {
        case PointDataLoader.EWS:
          return fetchEWSData(dataUrl, date, dispatch);
        case PointDataLoader.ACLED:
          return fetchACLEDIncidents(
            dataUrl,
            date,
            dispatch,
            additionalQueryParams,
          );
        default:
          break;
      }
    }

    const formattedDate = date && getFormattedDate(date, 'default');

    // TODO exclusive to this api...
    const dateQuery = `beginDateTime=${
      formattedDate || '2000-01-01'
    }&endDateTime=${formattedDate || '2023-12-21'}`;

    const requestUrl = `${dataUrl}${
      dataUrl.includes('?') ? '&' : '?'
    }${dateQuery}${
      additionalQueryParams
        ? `&${queryParamsToString(additionalQueryParams)}`
        : ''
    }`;

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
      response = await fetchWithTimeout(
        requestUrl,
        dispatch,
        {
          mode: 'cors',
          headers,
          ...(loader === PointDataLoader.GOOGLE_FLOOD && {
            timeout: GOOGLE_FLOOD_REQUEST_TIMEOUT,
          }),
        },
        `Request failed for fetching point layer data at ${requestUrl}`,
      );

      data = (await response.json()) as PointData[];
    } catch (error) {
      if (fallbackData) {
        // fallback data isn't filtered, therefore we must filter it.

        response = await fetchWithTimeout(
          fallbackData || '',
          dispatch,
          {},
          `Request failed for fetching point layer data at fallback url ${fallbackData}`,
        );

        data = ((await response.json()) as PointData[]).filter(
          // we cant do a string comparison here because sometimes the date in json is stored as YYYY-M-D instead of YYYY-MM-DD
          obj =>
            getFormattedDate(obj.dat, 'default') ===
            getFormattedDate(formattedDate, 'default'),
        );
      } else {
        if ((error as HTTPError)?.statusCode === 401) {
          dispatch(setUserAuthGlobal(undefined));
        }
        throw error;
      }
    }

    if (adminLevelDisplay && !Object.keys(data).includes('message')) {
      const { adminCode } = adminLevelDisplay;

      return getAdminLevelDataLayerData({
        data,
        adminLevelDataLayerProps: {
          boundary,
          adminCode,
          dataField,
          featureInfoProps,
        },
        dispatch,
      });
    }
    if ((data as any)?.type === 'FeatureCollection') {
      return data as any as PointLayerData;
    }
    return GeoJSON.parse(data, {
      Point: ['lat', 'lon'],
    }) as unknown as PointLayerData;
  };
