/* eslint-disable camelcase */
export type ApiData = {
  geotiff_url: string;
  zones_url: string;
  group_by?: string;
  geojson_out?: string;
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
