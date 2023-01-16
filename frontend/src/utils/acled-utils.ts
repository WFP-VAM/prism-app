import { sortBy } from 'lodash';
import GeoJSON from 'geojson';
import moment from 'moment';
import { PointLayerData } from '../config/types';
import { DEFAULT_DATE_FORMAT } from './name-utils';
import { appConfig } from '../config';

export const fetchACLEDDates = async (url: string): Promise<number[]> => {
  const acledIso = appConfig.acled_iso;

  if (!acledIso) {
    throw new Error(
      'ACLED processing is defined in layers.json. However, no country ISO code was set in the prism.json config. Please set the "acled_iso" parameter.',
    );
  }

  const datesUrl = `${url}?iso=${acledIso}&limit=0&fields=event_date`;

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
): Promise<PointLayerData> => {
  const acledIso = appConfig.acled_iso;
  const dateStr = moment(date).format(DEFAULT_DATE_FORMAT);

  const incidentsUrl = `${url}?&iso=${acledIso}&limit=0&event_date=${dateStr}`;

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
