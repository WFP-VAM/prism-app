import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { camelCase } from 'lodash';
import GeoJSON from 'geojson';
import moment from 'moment';
import type { LazyLoader } from './layer-data';
import { PointDataLayerProps } from '../../config/types';
import type { CreateAsyncThunkTypes, RootState } from '../store';
import { TableData } from '../tableStateSlice';

declare module 'geojson' {
  export const version: string;
  export const defaults: object;

  export function parse(
    data: object,
    properties: object,
    callback?: Function,
  ): PointLayerData;
}

export type PointLayerData = {
  lat: number;
  lon: number;
  date: number; // in unix time.
  [key: string]: any;
}[];

export const queryParamsToString = (queryParams?: {
  [key: string]: string | { [key: string]: string };
}): string =>
  queryParams
    ? Object.entries(queryParams)
        .map(([key, value]) => {
          if (key === 'filters') {
            const filterValues = Object.entries(value)
              .map(([filterKey, filterValue]) => `${filterKey}=${filterValue}`)
              .join(',');

            return `filters=${filterValues}`;
          }
          return `${camelCase(key)}=${value}`;
        })
        .join('&')
    : '';

export const fetchPointLayerData: LazyLoader<PointDataLayerProps> = () => async ({
  date,
  layer: { data: dataUrl, fallbackData, additionalQueryParams },
}) => {
  // This function fetches point data from the API.
  // If this endpoint is not available or we run into an error,
  // we should get the data from the local public file in layer.fallbackData

  const formattedDate = date && moment(date).format('YYYY-MM-DD');

  // TODO exclusive to this api...
  const dateQuery = `beginDateTime=${
    formattedDate || '2000-01-01'
  }&endDateTime=${formattedDate || '2023-12-21'}`;

  const requestUrl = `${dataUrl}${
    dataUrl.includes('?') ? '&' : '?'
  }${dateQuery}&${queryParamsToString(additionalQueryParams)}`;

  let data;
  try {
    // eslint-disable-next-line fp/no-mutation
    data = (await (
      await fetch(requestUrl, {
        mode: 'cors',
      })
    ).json()) as PointLayerData;
  } catch (ignored) {
    // fallback data isn't filtered, therefore we must filter it.
    // eslint-disable-next-line fp/no-mutation
    data = ((await (
      await fetch(fallbackData || '')
    ).json()) as PointLayerData).filter(
      // we cant do a string comparison here because sometimes the date in json is stored as YYYY-M-D instead of YYYY-MM-DD
      // using moment here helps compensate for these discrepancies
      obj =>
        moment(obj.date).format('YYYY-MM-DD') ===
        moment(formattedDate).format('YYYY-MM-DD'),
    );
  }
  return GeoJSON.parse(data, { Point: ['lat', 'lon'] });
};

interface PointDatasetState {
  data?: TableData;
}

const initialState: PointDatasetState = {};

export type PointDatasetParams = {
  url: string;
};

export const loadEWS1294Dataset = createAsyncThunk<
  TableData,
  PointDatasetParams,
  CreateAsyncThunkTypes
>('datasetState/loadDataset', async (params: PointDatasetParams) => {
  (await fetch(params.url)).json();
  return {
    rows: [
      {
        external_id: 'External ID',
        d1: '29/01/22',
        d2: '30/01/22',
        d4: '31/01/22',
        d5: '01/02/22',
        d6: '02/02/22',
        d7: '03/02/22',
      },
      {
        external_id: 'TEPv4.0-001',
        d1: '3920',
        d2: '1821',
        d4: '2290',
        d5: '873',
        d6: '298',
        d7: '2222',
      },
    ],
    columns: ['external_id', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'],
  };
});

export const pointDatasetResultStateSlice = createSlice({
  name: 'PointDatasetResultSlice',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(
      loadEWS1294Dataset.fulfilled,
      (
        { ...rest },
        { payload }: PayloadAction<TableData>,
      ): PointDatasetState => ({
        ...rest,
        data: payload,
      }),
    );
  },
});

export const PointDatasetSelector = (state: RootState): TableData | undefined =>
  state.pointDatasetState.data;

export default pointDatasetResultStateSlice.reducer;
