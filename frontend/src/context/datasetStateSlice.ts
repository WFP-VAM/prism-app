import moment from 'moment';
import { orderBy } from 'lodash';
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { CreateAsyncThunkTypes, RootState } from './store';
import { TableData } from './tableStateSlice';
import { ChartType, DatasetField } from '../config/types';
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
  level: string;
  name: string;
};

type BoundaryPropsDict = { [key: string]: BoundaryProps };

export type AdminBoundaryParams = {
  boundaryProps: BoundaryPropsDict;
  url: string;
  serverLayerName: string;
  id: string;
  datasetFields: DatasetField[];
};

export type AdminBoundaryRequestParams = AdminBoundaryParams & {
  selectedDate: number;
};

export type DatasetRequestParams =
  | AdminBoundaryRequestParams
  | EWSDataPointsRequestParams;

type DataItem = {
  date: number;
  values: { [key: string]: string };
};

export enum TableDataFormat {
  DATE = 'date',
  TIME = 'time',
}

export const CHART_DATA_PREFIXES = { col: 'd', date: 'Date' };

const createTableData = (
  results: DataItem[],
  format: TableDataFormat,
): TableData => {
  const momentFormat =
    format === TableDataFormat.DATE ? DEFAULT_DATE_FORMAT : 'HH:mm';

  const sortedRows = orderBy(results, item => item.date).map(row => {
    const valuesObj = Object.values(row.values).reduce(
      (acc, item, index) => ({
        ...acc,
        [`${CHART_DATA_PREFIXES.col}${index + 1}`]: item,
      }),
      {},
    );

    return {
      [CHART_DATA_PREFIXES.date]: moment(row.date).format(momentFormat),
      ...valuesObj,
    };
  });

  const columns = Object.keys(sortedRows[0]);
  const initRow = Object.keys(results[0].values).reduce(
    (acc, item, index) => ({
      ...acc,
      [`${CHART_DATA_PREFIXES.col}${index + 1}`]: item,
    }),
    { [CHART_DATA_PREFIXES.date]: CHART_DATA_PREFIXES.date },
  );

  const data: TableData = {
    rows: [initRow, ...sortedRows],
    columns,
  };

  return data;
};

export const loadEWSDataset = async (
  params: EWSDataPointsRequestParams,
): Promise<TableData> => {
  const { date, externalId, triggerLevels, baseUrl } = params;

  const dataPoints: EWSSensorData[] = await fetchEWSDataPointsByLocation(
    baseUrl,
    date,
    externalId,
  );

  const results: DataItem[] = dataPoints.map(item => {
    const [measureDate, value] = item.value;

    return {
      date: moment(measureDate).valueOf(),
      values: { measure: value.toString() },
    };
  });

  const tableData = createTableData(results, TableDataFormat.TIME);

  const EWSConfig = Object.entries(triggerLevels).reduce(
    (acc, [key, value]) => {
      const obj = {
        ...EWSTriggersConfig[key],
        values: tableData.rows.map(() => value),
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
};

type HDCResponse = {
  data: { [key: string]: number[] };
  date: string[];
  valids: number[];
};

/**
 * Executes a request to the WFP Humanitarian Data Cube (HDC)
 *
 * @return Promise with parsed object from request as DataItem array.
 */
const fetchHDC = async (
  url: string,
  datasetFields: DatasetField[],
  params: { [key: string]: any },
): Promise<DataItem[]> => {
  const requestParamsStr = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const response = await fetch(`${url}?${requestParamsStr}`);
  const responseJson: HDCResponse = await response.json();

  const dates: number[] = responseJson.date.map((date: string) =>
    moment(date).valueOf(),
  );

  const dataItems: DataItem[] = dates.map((date, index) => {
    const values = datasetFields.reduce(
      (acc, field) => ({
        ...acc,
        [field.label]: responseJson.data[field.key]
          ? responseJson.data[field.key][index]
          : field.fallback,
      }),
      {},
    );

    return { date, values };
  });

  return dataItems;
};

export const loadAdminBoundaryDataset = async (
  params: AdminBoundaryRequestParams,
): Promise<TableData> => {
  const endDate = moment(params.selectedDate);
  const startDate = endDate.clone().subtract(1, 'year');

  const {
    url: hdcUrl,
    id,
    boundaryProps,
    serverLayerName,
    datasetFields,
  } = params;
  const { code: adminCode, level } = boundaryProps[id];

  const endDateStr = endDate.format(DEFAULT_DATE_FORMAT);
  const startDateStr = startDate.format(DEFAULT_DATE_FORMAT);

  const hdcRequestParams = {
    level,
    admin_id: adminCode,
    coverage: 'full',
    vam:
      serverLayerName.includes('vim') || serverLayerName.includes('viq')
        ? 'vim'
        : 'rfh',
    start: startDateStr,
    end: endDateStr,
  };

  const results = await fetchHDC(hdcUrl, datasetFields, hdcRequestParams);
  const tableData = createTableData(results, TableDataFormat.DATE);

  return new Promise<TableData>(resolve => resolve(tableData));
};

export const loadDataset = createAsyncThunk<
  TableData,
  DatasetRequestParams,
  CreateAsyncThunkTypes
>('datasetState/loadDataset', async (params: DatasetRequestParams) => {
  const results = (params as AdminBoundaryRequestParams).id
    ? loadAdminBoundaryDataset(params as AdminBoundaryRequestParams)
    : loadEWSDataset(params as EWSDataPointsRequestParams);

  return results;
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
