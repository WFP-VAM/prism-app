import { FeatureCollection } from 'geojson';
import { appConfig } from 'config';
import type { CompositeLayerProps } from 'config/types';
import { fetchWithTimeout } from 'utils/fetch-with-timeout';
import { HTTPError, LocalError } from 'utils/error-utils';
import { addNotification } from 'context/notificationStateSlice';
import {
  findClosestDate,
  getFormattedDate,
  getSeasonBounds,
} from 'utils/date-utils';

import type { LayerDataParams, LazyLoader } from './layer-data';

export interface CompositeLayerData extends FeatureCollection {}

export const fetchCompositeLayerData: LazyLoader<CompositeLayerProps> =
  () =>
  async (params: LayerDataParams<CompositeLayerProps>, { dispatch }) => {
    const { layer, date, availableDates } = params;

    const referenceDate = date ? new Date(date) : new Date();
    const providedSeasons = layer.validity?.seasons;
    const seasonBounds = getSeasonBounds(referenceDate, providedSeasons);
    if (!seasonBounds) {
      console.error(
        `No season bounds found for ${layer.id} with date ${referenceDate}`,
      );
      return undefined;
    }
    const useMonthly = !layer.period || layer.period === 'monthly';
    const startDate = useMonthly ? referenceDate : seasonBounds.start;
    // For monthly, setting an end date to one month after the start date
    // For seasonal, setting an end date to the end of the season
    const endDate = useMonthly
      ? new Date(startDate).setMonth(startDate.getMonth() + 1)
      : new Date(seasonBounds.end).getTime();

    const availableQueryDates = availableDates
      ? Array.from(new Set(availableDates.map(dateItem => dateItem.queryDate)))
      : [];

    const closestDateToStart = availableDates
      ? findClosestDate(startDate.getTime(), availableQueryDates)
      : startDate;
    const closestDateToEnd = availableDates
      ? findClosestDate(endDate, availableQueryDates)
      : endDate;

    const {
      baseUrl,
      inputLayers,
      startDate: areaStartDate,
      endDate: areaEndDate,
    } = layer;
    const { boundingBox } = appConfig.map;

    // docs: https://hip-service.ovio.org/docs#/default/run_q_multi_geojson_q_multi_geojson_post
    const body = {
      begin: getFormattedDate(closestDateToStart, 'default'),
      end: getFormattedDate(closestDateToEnd, 'default'),
      area: {
        min_lon: boundingBox[0],
        min_lat: boundingBox[1],
        max_lon: boundingBox[2],
        max_lat: boundingBox[3],
        start_date: areaStartDate ?? '2002-07-01',
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

      const geojson = await response.json();

      return geojson;
    } catch (error) {
      if (!(error instanceof LocalError) && !(error instanceof HTTPError)) {
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
