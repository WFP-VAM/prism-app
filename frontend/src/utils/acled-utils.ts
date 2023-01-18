import { sortBy } from 'lodash';
import GeoJSON from 'geojson';
import moment from 'moment';
import { PointLayerData, PointDataLayerProps } from '../config/types';
import { DEFAULT_DATE_FORMAT } from './name-utils';
import { queryParamsToString } from './url-utils';

export const fetchACLEDDates = async (
  url: string,
  additionalQueryParams?: PointDataLayerProps['additionalQueryParams'],
): Promise<number[]> => {
  if (
    additionalQueryParams &&
    !Object.keys(additionalQueryParams).includes('iso')
  ) {
    throw new Error(
      'ACLED processing is defined in layers.json. However, no country ISO code was set in the additional_query_params field. Please set the "iso" parameter.',
    );
  }

  const queryParams = { ...additionalQueryParams, fields: 'event_date' };

  const datesUrl = `${url}?${queryParamsToString(queryParams)}`;

  const resp = await fetch(datesUrl);
  const respJson = await resp.json();

  /* eslint-disable camelcase */
  const dates: number[] = respJson.data.map((item: { event_date: string }) =>
    moment(item.event_date).valueOf(),
  );
  /* eslint-enable camelcase */

  const datesSet = [...new Set(dates)];

  return sortBy(datesSet);
};

export const fetchACLEDIncidents = async (
  url: string,
  date: number,
  additionalQueryParams?: PointDataLayerProps['additionalQueryParams'],
): Promise<PointLayerData> => {
  const dateStr = moment(date).format(DEFAULT_DATE_FORMAT);

  const queryParams = { ...additionalQueryParams, event_date: dateStr };

  const incidentsUrl = `${url}?${queryParamsToString(queryParams, true)}`;

  const resp = await fetch(incidentsUrl);
  const respJson = await resp.json();

  const incidents = respJson.data.map((incident: any) => ({
    ...incident,
    lat: parseFloat(incident.latitude),
    lon: parseFloat(incident.longitude),
    fatalities: parseInt(incident.fatalities, 10),
  }));

  return {
    features: GeoJSON.parse(incidents, {
      Point: ['lat', 'lon'],
    }),
  };
};
