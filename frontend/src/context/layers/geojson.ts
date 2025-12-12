import GeoJSON from 'geojson';
import { GeojsonDataLayerProps } from 'config/types';
import { queryParamsToString } from 'utils/url-utils';
import { fetchWithTimeout } from 'utils/fetch-with-timeout';
import { HTTPError } from 'utils/error-utils';
import { setUserAuthGlobal } from 'context/serverStateSlice';
import type { LazyLoader } from './layer-data';

const GEOJSON_REQUEST_TIMEOUT = 60000;

export const fetchGeojsonLayerData: LazyLoader<GeojsonDataLayerProps> =
  () =>
  async ({ layer: { data: dataUrl, additionalQueryParams } }, { dispatch }) => {
    const queryParams = queryParamsToString(additionalQueryParams);
    const requestUrl = `${dataUrl}${
      dataUrl.includes('?') ? '&' : '?'
    }${queryParams}`;
    let data;
    let response: Response;
    // TODO - Better error handling, esp. for unauthorized requests.
    try {
      response = await fetchWithTimeout(
        requestUrl,
        dispatch,
        {
          timeout: GEOJSON_REQUEST_TIMEOUT,
        },
        `Request failed for fetching point layer data at ${requestUrl}`,
      );

      data = (await response.json()) as GeoJSON.FeatureCollection;
    } catch (error) {
      if ((error as HTTPError)?.statusCode === 401) {
        dispatch(setUserAuthGlobal(undefined));
      }
      throw error;
    }

    return data as any as GeoJSON.FeatureCollection;
  };
