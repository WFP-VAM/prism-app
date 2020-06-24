import { getWCSLayerUrl } from '../context/layers/wms';

/* eslint-disable camelcase */
export type ApiData = {
  geotiff_url: ReturnType<typeof getWCSLayerUrl>; // helps developers get an understanding of what might go here, despite the type eventually being a string.
  zones_url: string;
  group_by?: string;
  geojson_out?: boolean;
};

export async function fetchApiData(url: string, apiData: ApiData) {
  return (
    await fetch(url, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      // body data type must match "Content-Type" header
      body: JSON.stringify(apiData),
    })
  ).json();
}
