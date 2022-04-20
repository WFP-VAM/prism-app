import moment from 'moment';
import { orderBy } from 'lodash';
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { CreateAsyncThunkTypes, RootState } from './store';
import { TableData } from './tableStateSlice';
import { ChartType } from '../config/types';

type BoundaryPropsDict = { [key: string]: BoundaryProps };

type ServerParams = {
  url: string;
  layerName: string;
};

type DatasetState = {
  data?: TableData;
  title?: string;
  isLoading: boolean;
  boundaryProps?: BoundaryPropsDict;
  id?: string;
  serverParams?: ServerParams;
  chartType?: ChartType;
};

const initialState: DatasetState = { isLoading: false };

type DatasetResult = {
  data: TableData;
  id: string;
};

type BoundaryProps = {
  code: number;
  urlPath: string;
  name: string;
};

export type AdminBoundaryParams = {
  boundaryProps: BoundaryPropsDict;
  serverParams: ServerParams;
  title: string;
  id: string;
  chartType: ChartType;
};

export type DatasetParams = {
  id: string;
  boundaryProps: BoundaryPropsDict;
  url: string;
  serverLayerName: string;
  selectedDate: number;
};

type DataItem = {
  date: number;
  value: number;
};

const getDatasetFromUrl = async (
  year: number,
  params: DatasetParams,
  startDate: number,
  endDate: number,
): Promise<DataItem[]> => {
  const { serverLayerName, url, id, boundaryProps } = params;

  const { code: adminCode, urlPath } = boundaryProps[id];

  const serverUrl = `${url}/${urlPath}/${year}.json`;

  const resp = await fetch(serverUrl);
  const results = await resp.json();

  const filteredRows = results.DataList.filter(
    (item: any) => item[id] === adminCode,
  )
    .map((item: any) => ({
      date: moment(item.time).valueOf(),
      value: item[serverLayerName],
    }))
    .filter(({ date }: DataItem) => date >= startDate && date <= endDate);

  return filteredRows;
};

export const loadDataset = createAsyncThunk<
  DatasetResult,
  DatasetParams,
  CreateAsyncThunkTypes
>('datasetState/loadDataset', async (params: DatasetParams) => {
  const endDate = moment(params.selectedDate);
  const startDate = endDate.clone().subtract(1, 'year');

  const years = [endDate.year(), startDate.year()];

  const promises = years.map(year =>
    getDatasetFromUrl(year, params, startDate.valueOf(), endDate.valueOf()),
  );
  const resultsAll = await Promise.all(promises);

  const results: DataItem[] = resultsAll.reduce(
    (acc, item) => [...acc, ...item],
    [],
  );

  const sortedRows = orderBy(results, item => item.date).map((item, index) => ({
    ...item,
    day: `d${index + 1}`,
  }));

  const datesRows = sortedRows.reduce(
    (acc, obj) => ({
      ...acc,
      [obj.day]: moment(obj.date).format('YYYY-MM-DD'),
    }),
    {},
  );

  const valuesRows = sortedRows.reduce((acc, obj) => {
    if (!obj.value) {
      return acc;
    }

    return { ...acc, [obj.day]: obj.value.toString() };
  }, {});

  const columns = Object.keys(valuesRows);
  const data: TableData = {
    rows: [datesRows, valuesRows],
    columns,
  };

  const datasetResult: DatasetResult = {
    data,
    id: params.id,
  };

  return new Promise<DatasetResult>(resolve => resolve(datasetResult));
});

export const datasetResultStateSlice = createSlice({
  name: 'DatasetResultSlice',
  initialState,
  reducers: {
    clearDataset: (): DatasetState => initialState,
    setBoundaryParams: (
      state,
      { payload }: PayloadAction<AdminBoundaryParams>,
    ): DatasetState => ({
      ...state,
      title: payload.title,
      serverParams: payload.serverParams,
      boundaryProps: payload.boundaryProps,
      id: payload.id,
      chartType: payload.chartType,
    }),
    updateAdminId: (
      state,
      { payload }: PayloadAction<string>,
    ): DatasetState => ({
      ...state,
      id: payload,
    }),
  },
  extraReducers: builder => {
    builder.addCase(
      loadDataset.fulfilled,
      (
        { ...rest },
        { payload }: PayloadAction<DatasetResult>,
      ): DatasetState => ({
        ...rest,
        data: payload.data,
        id: payload.id,
        isLoading: false,
      }),
    );

    builder.addCase(loadDataset.pending, state => ({
      ...state,
      isLoading: true,
    }));
  },
});

export const datasetSelector = (state: RootState): DatasetState =>
  state.datasetState;
export const loadingDatasetSelector = (state: RootState): boolean =>
  state.datasetState.isLoading;

// Setters
export const {
  clearDataset,
  setBoundaryParams,
  updateAdminId,
} = datasetResultStateSlice.actions;

export default datasetResultStateSlice.reducer;
