import { FeatureCollection } from 'geojson';
import moment from 'moment';
import { DEFAULT_DATE_FORMAT } from './name-utils';

import { WMSLayerProps } from '../config/types';

interface propTypes {
  lyr: WMSLayerProps;
  startDate: number;
  endDate: number;
}

export function fetchWMSLayerAsGeoJSON(
  options: propTypes,
): Promise<FeatureCollection> {
  const { lyr, startDate, endDate } = options;

  if (lyr.type !== 'wms') {
    throw Error(
      `Unexpected layer type. Expected: "wms". Actual: "${lyr.type}"`,
    );
  }

  const wfsServerURL = `${lyr.baseUrl}/wfs`;

  const params = new URLSearchParams();
  params.set('SERVICE', 'WFS');
  params.set('request', 'GetFeature');
  params.set('typeNames', lyr.serverLayerName); // per https://docs.geoserver.org/latest/en/user/services/wfs/reference.html
  params.set('outputFormat', 'application/json'); // per https://docs.geoserver.org/latest/en/user/services/wfs/outputformats.html

  if (startDate && endDate) {
    params.set(
      'cql_filter',
      `timestamp BETWEEN ${moment(startDate).format(
        DEFAULT_DATE_FORMAT,
      )} AND ${moment(endDate).format(DEFAULT_DATE_FORMAT)}`,
    );
  }

  // may want/need to add additionalQueryParams like srsName and bbox

  const url = `${wfsServerURL}?${params.toString()}`;

  return fetch(url).then(r => r.json());
}
