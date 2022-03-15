import { FeatureCollection } from 'geojson';

import { WMSLayerProps } from '../config/types';

export function fetchWMSLayerAsGeoJSON(
  lyr: WMSLayerProps,
): Promise<FeatureCollection> {
  if (lyr.type !== 'wms') {
    throw Error('unexpected layer type');
  }

  const wfsServerURL = `${lyr.baseUrl}/wfs`;

  const params = new URLSearchParams();
  params.set('SERVICE', 'WFS');
  params.set('request', 'GetFeature');
  params.set('typeNames', lyr.serverLayerName); // per https://docs.geoserver.org/latest/en/user/services/wfs/reference.html
  params.set('outputFormat', 'application/json'); // per https://docs.geoserver.org/latest/en/user/services/wfs/outputformats.html

  // srsName=CRS&
  // bbox=a1,b1,a2,b2

  // may need to add additionalQueryParams

  const url = `${wfsServerURL}?${params.toString()}`;

  return fetch(url).then(r => r.json());
}
