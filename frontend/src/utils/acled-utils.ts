import { sortBy } from 'lodash';
import GeoJSON from 'geojson';
import { Dispatch } from 'redux';
import {
  PointLayerData,
  PointDataLayerProps,
  ReferenceDateTimestamp,
} from 'config/types';
import { addNotification } from 'context/notificationStateSlice';
import { queryParamsToString } from './url-utils';
import { fetchWithTimeout } from './fetch-with-timeout';
import { LocalError } from './error-utils';
import { getFormattedDate, getTimeInMilliseconds } from './date-utils';

export const fetchACLEDDates = async (
  url: string,
  dispatch: Dispatch,
  additionalQueryParams?: PointDataLayerProps['additionalQueryParams'],
): Promise<ReferenceDateTimestamp[]> => {
  try {
    if (
      additionalQueryParams &&
      !Object.keys(additionalQueryParams).includes('iso')
    ) {
      throw new LocalError(
        'ACLED processing is defined in layers.json. However, no country ISO code was set in the additional_query_params field. Please set the "iso" parameter.',
      );
    }
    const queryParams = { ...additionalQueryParams, fields: 'event_date' };

    const datesUrl = `${url}?${queryParamsToString(queryParams)}`;

    const resp = await fetchWithTimeout(
      datesUrl,
      dispatch,
      {},
      `Request failed for fetching ACLED Dates at ${datesUrl}`,
    );
    const respJson = await resp.json();

    /* eslint-disable camelcase */
    const dates: ReferenceDateTimestamp[] = respJson.data.map(
      (item: { event_date: string }) => getTimeInMilliseconds(item.event_date),
    );
    /* eslint-enable camelcase */

    const datesSet = [...new Set(dates)];

    return sortBy(datesSet);
  } catch (error) {
    if (error instanceof LocalError) {
      console.error(error);
      dispatch(
        addNotification({
          message: error.message,
          type: 'warning',
        }),
      );
    }
    return [];
  }
};

export const fetchACLEDIncidents = async (
  url: string,
  date: number,
  dispatch: Dispatch,
  additionalQueryParams?: PointDataLayerProps['additionalQueryParams'],
): Promise<PointLayerData> => {
  const dateStr = getFormattedDate(date, 'default');
  if (!dateStr) {
    throw new Error(`Invalid value for date: ${date}`);
  }

  const queryParams = { ...additionalQueryParams, event_date: dateStr };

  const incidentsUrl = `${url}?${queryParamsToString(queryParams, true)}`;
  try {
    const resp = await fetchWithTimeout(
      incidentsUrl,
      dispatch,
      {},
      `Request failed for fetching ACLED incidents at ${incidentsUrl}`,
    );
    const respJson = await resp.json();

    const incidents = respJson.data.map((incident: any) => ({
      ...incident,
      lat: parseFloat(incident.latitude),
      lon: parseFloat(incident.longitude),
      fatalities: parseInt(incident.fatalities, 10),
    }));

    return GeoJSON.parse(incidents, {
      Point: ['lat', 'lon'],
    }) as any as PointLayerData;
  } catch (error) {
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }
};
