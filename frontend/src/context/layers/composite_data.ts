import { FeatureCollection } from '@turf/helpers';
import { appConfig } from 'config';
import type { CompositeLayerProps } from 'config/types';
import { fetchWithTimeout } from 'utils/fetch-with-timeout';
import { LocalError } from 'utils/error-utils';
import { addNotification } from 'context/notificationStateSlice';
import { getFormattedDate } from 'utils/date-utils';

import type { LayerDataParams, LazyLoader } from './layer-data';

export interface CompositeLayerData extends FeatureCollection {}

export const fetchCompositeLayerData: LazyLoader<CompositeLayerProps> = () => async (
  params: LayerDataParams<CompositeLayerProps>,
  { dispatch },
) => {
  const { layer, date } = params;
  const startDate = date ? new Date(date) : new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const { baseUrl: _baseUrl, inputLayers, startDate: areaStartDate } = layer;
  const baseUrl = process.env.REACT_APP_USE_LOCAL_HIP_SERVICE
    ? process.env.REACT_APP_USE_LOCAL_HIP_SERVICE
    : _baseUrl;
  const { boundingBox } = appConfig.map;

  // docs: https://hip-service.ovio.org/docs#/default/run_q_multi_geojson_q_multi_geojson_post
  const body = {
    begin: getFormattedDate(startDate, 'default'),
    end: getFormattedDate(endDate, 'default'),
    area: {
      min_lon: boundingBox[0],
      min_lat: boundingBox[1],
      max_lon: boundingBox[2],
      max_lat: boundingBox[3],
      start_date: areaStartDate ?? '2002-01-01',
      end_date: '2021-07-31',
    },
    layers: inputLayers.map(({ key, aggregation, importance, invert }) => ({
      key,
      aggregation,
      importance,
      invert: Boolean(invert),
    })),
  };

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
