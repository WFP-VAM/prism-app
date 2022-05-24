import moment from 'moment';
import { orderBy } from 'lodash';
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { CreateAsyncThunkTypes, RootState } from './store';
import { TableData } from './tableStateSlice';
import { ChartType } from '../config/types';
import { DEFAULT_DATE_FORMAT } from '../utils/name-utils';

import {
  fetchEWSDataPointsByLocation,
  EWSSensorData,
  EWSTriggersConfig,
} from '../utils/ews-utils';

export type EWSParams = {
  externalId: string;
  triggerLevels: EWSTriggerLevels;
  baseUrl: string;
};

type EWSTriggerLevels = {
  watchLevel: number;
  warning: number;
  severeWarning: number;
};

type EWSDataPointsRequestParams = EWSParams & {
  date: number;
};

type DatasetState = {
  data?: TableData;
  isLoading: boolean;
  datasetParams?: AdminBoundaryParams | EWSParams;
  chartType: ChartType;
  title: string;
};

const initialState: DatasetState = {
  isLoading: false,
  chartType: ChartType.Line,
  title: '',
};

type BoundaryProps = {
  code: number;
  urlPath: string;
  name: string;
};

type BoundaryPropsDict = { [key: string]: BoundaryProps };

export type AdminBoundaryParams = {
  boundaryProps: BoundaryPropsDict;
  url: string;
  serverLayerName: string;
  id: string;
};

export type DatasetParams = AdminBoundaryParams & {
  selectedDate: number;
};

type DataItem = {
  date: number;
  value: number;
};

export enum TableDataFormat {
  DATE = 'date',
  TIME = 'time',
}

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

const createTableData = (
  results: DataItem[],
  format: TableDataFormat,
): TableData => {
  const prefix = format === TableDataFormat.DATE ? 'd' : 't';
  const momentFormat =
    format === TableDataFormat.DATE ? DEFAULT_DATE_FORMAT : 'HH:mm';

  const sortedRows = orderBy(results, item => item.date).map((item, index) => ({
    ...item,
    day: `${prefix}${index + 1}`,
  }));

  const datesRows = sortedRows.reduce(
    (acc, obj) => ({
      ...acc,
      [obj.day]: moment(obj.date).format(momentFormat),
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

  return data;
};

export const loadEWSDataset = createAsyncThunk<
  TableData,
  EWSDataPointsRequestParams,
  CreateAsyncThunkTypes
>('datasetState/loadEWSDataset', async (params: EWSDataPointsRequestParams) => {
  const { date, externalId, triggerLevels, baseUrl } = params;

  const dataPoints: EWSSensorData[] = await fetchEWSDataPointsByLocation(
    baseUrl,
    date,
    externalId,
  );

  const filterDate = moment(date).endOf('day').valueOf();

  const results: DataItem[] = dataPoints
    .map(item => {
      const [measureDate, value] = item.value;

      return { date: moment(measureDate).valueOf(), value };
    })
    .filter(item => item.date <= filterDate); // Api returns items day after.

  const tableData = createTableData(results, TableDataFormat.TIME);

  const EWSConfig = Object.entries(triggerLevels).reduce(
    (acc, [key, value]) => {
      const obj = {
        ...EWSTriggersConfig[key],
        values: tableData.columns.map(() => value),
      };

      return { ...acc, [key]: obj };
    },
    {},
  );

  const tableDataWithEWSConfig: TableData = {
    ...tableData,
    EWSConfig,
  };

  return new Promise<TableData>(resolve => resolve(tableDataWithEWSConfig));
});

export const loadDataset = createAsyncThunk<
  TableData,
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

  const tableData = createTableData(results, TableDataFormat.DATE);

  return new Promise<TableData>(resolve => resolve(tableData));
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
      datasetParams: payload,
    }),
    setDatasetTitle: (
      state,
      { payload }: PayloadAction<string>,
    ): DatasetState => ({ ...state, title: payload }),
    setDatasetChartType: (
      state,
      { payload }: PayloadAction<ChartType>,
    ): DatasetState => ({ ...state, chartType: payload }),
    updateAdminId: (
      state,
      { payload }: PayloadAction<string>,
    ): DatasetState => {
      if (!state.datasetParams) {
        return state;
      }

      const adminBoundaryParams = { ...state.datasetParams, id: payload };

      return { ...state, datasetParams: adminBoundaryParams };
    },
    setEWSParams: (
      state,
      { payload }: PayloadAction<EWSParams & { chartTitle: string }>,
    ): DatasetState => {
      const { externalId, chartTitle, triggerLevels, baseUrl } = payload;

      return {
        ...state,
        datasetParams: { externalId, triggerLevels, baseUrl },
        title: chartTitle,
      };
    },
  },
  extraReducers: builder => {
    builder.addCase(
      loadDataset.fulfilled,
      ({ ...rest }, { payload }: PayloadAction<TableData>): DatasetState => ({
        ...rest,
        data: payload,
        isLoading: false,
      }),
    );

    builder.addCase(loadDataset.pending, state => ({
      ...state,
      isLoading: true,
    }));
    builder.addCase(
      loadEWSDataset.fulfilled,
      ({ ...state }, { payload }: PayloadAction<TableData>): DatasetState => ({
        ...state,
        isLoading: false,
        data: payload,
      }),
    );
    builder.addCase(loadEWSDataset.pending, state => ({
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
  setDatasetTitle,
  setDatasetChartType,
  setEWSParams,
} = datasetResultStateSlice.actions;

export default datasetResultStateSlice.reducer;
