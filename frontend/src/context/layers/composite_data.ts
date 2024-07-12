import { FeatureCollection } from 'geojson';
import { appConfig } from 'config';
import type { CompositeLayerProps } from 'config/types';
import { fetchWithTimeout } from 'utils/fetch-with-timeout';
import { LocalError } from 'utils/error-utils';
import { addNotification } from 'context/notificationStateSlice';
import { getFormattedDate, getSeasonBounds } from 'utils/date-utils';

import type { LayerDataParams, LazyLoader } from './layer-data';

export interface CompositeLayerData extends FeatureCollection {}

export const fetchCompositeLayerData: LazyLoader<CompositeLayerProps> =
  () =>
  async (params: LayerDataParams<CompositeLayerProps>, { dispatch }) => {
    const { layer, date } = params;
    const referenceDate = date ? new Date(date) : new Date();
    const seasonBounds = getSeasonBounds(referenceDate);
    const useMonthly = !layer.scale || layer.scale === 'monthly';
    const startDate = useMonthly ? referenceDate : seasonBounds.start;
    const endDate = useMonthly
      ? new Date(startDate).setMonth(startDate.getMonth() + 1)
      : seasonBounds.end;

    const {
      baseUrl,
      inputLayers,
      startDate: areaStartDate,
      endDate: areaEndDate,
    } = layer;
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
        end_date: areaEndDate ?? '2021-07-31',
      },
      layers: inputLayers.map(({ key, aggregation, importance, invert }) => ({
        key,
        aggregation,
        importance,
        invert: Boolean(invert),
      })),
    };

    try {
      const response = await fetchWithTimeout(baseUrl, dispatch, {
        body: JSON.stringify(body),
        method: 'POST',
        timeout: 600000, // 10min
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      // eslint-disable-next-line no-console
      console.log('Request config used for Qmulti:', {
        body,
      });

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
