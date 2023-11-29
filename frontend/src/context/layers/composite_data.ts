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

  const { layer } = params;
  const {
    baseUrl,
    id,
    aggregation,
    inputLayers,
    interval,
    dateType,
    startDate,
    endDate,
  } = layer;

  // eslint-disable-next-line no-console
  console.log(
    'layers data to use when endPoint will be available:',
    id,
    aggregation,
    inputLayers,
    interval,
    dateType,
    startDate,
    endDate,
  );
  try {
    const response = await fetchWithTimeout(
      baseUrl,
      dispatch,
      {},
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
