import { FeatureCollection } from '@turf/helpers';
import type { CompositeLayerProps } from 'config/types';
import { fetchWithTimeout } from 'utils/fetch-with-timeout';
import { LocalError } from 'utils/error-utils';
import { addNotification } from 'context/notificationStateSlice';

import type { LayerDataParams, LazyLoader } from './layer-data';

export interface CompositeLayerData extends FeatureCollection {}

export const fetchCompositeLayerData: LazyLoader<CompositeLayerProps> = () => async (
  params: LayerDataParams<CompositeLayerProps>,
  { dispatch },
) => {
  // to complete later with new endpoint for composite chart

  const { layer, date } = params;
  const endDate = (date ? new Date(date) : new Date())
    .toISOString()
    .split('T')[0];
  const { baseUrl, inputLayers, startDate } = layer;

  // docs: https://hip-service.ovio.org/docs#/default/run_q_multi_geojson_q_multi_geojson_post
  const body = {
    begin: startDate,
    end: endDate,
    area: {
      min_lon: 34.98,
      min_lat: 29.18,
      max_lon: 39.3,
      max_lat: 33.37,
      start_date: '2002-01-01',
      end_date: endDate,
    },
    config: inputLayers.map(({ key, aggregation, importance, invert }) => ({
      key,
      aggregation,
      importance,
      invert: invert || false,
    })),
  };

  // eslint-disable-next-line no-console
  console.log('Request config used for Qmulti:', {
    body,
  });
  try {
    const response = await fetchWithTimeout(
      baseUrl,
      dispatch,
      {
        body: JSON.stringify(body),
        method: 'POST',
        timeout: 600000, // 10min
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
      `Request failed for fetching boundary layer data at ${baseUrl}`,
    );
    const geojson = await response.json();

    return geojson;
  } catch (error) {
    if (!(error instanceof LocalError)) {
      return undefined;
    }
    console.error(error);
    dispatch(
      addNotification({
        message: error.message,
        type: 'warning',
      }),
    );
    return undefined;
  }
};
