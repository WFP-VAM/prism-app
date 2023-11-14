import moment from 'moment';
import { orderBy } from 'lodash';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Dispatch } from 'redux';
import { ChartType, DatasetField } from 'config/types';
import { DEFAULT_DATE_FORMAT } from 'utils/name-utils';
import {
  EWSSensorData,
  EWSTriggersConfig,
  fetchEWSDataPointsByLocation,
} from 'utils/ews-utils';
import { fetchWithTimeout } from 'utils/fetch-with-timeout';
import type { CreateAsyncThunkTypes, RootState } from './store';
import { TableData } from './tableStateSlice';

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
  startDate?: number;
  endDate?: number;
  level: string;
  adminCode: number;
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

  return {
    rows: [initRow, ...sortedRows],
    columns,
  };
};

export const loadEWSDataset = async (
  params: EWSDataPointsRequestParams,
  dispatch: Dispatch,
): Promise<TableData> => {
  const { date, externalId, triggerLevels, baseUrl } = params;

  const dataPoints: EWSSensorData[] = await fetchEWSDataPointsByLocation(
    baseUrl,
    date,
    dispatch,
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
  dispatch: Dispatch,
): Promise<DataItem[]> => {
  const requestParamsStr = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  // TODO - better error handling.
  let responseJson: HDCResponse = {
    data: {
      rfh: [100],
    },
    valids: [6.0],
    date: ['2022-03-21'],
  };
  const response = await fetchWithTimeout(
    `${url}?${requestParamsStr}`,
    dispatch,
    {},
    `Request failed to get HDC data at ${url}?${requestParamsStr}`,
  );

  // eslint-disable-next-line fp/no-mutation
  responseJson = await response.json();

  const dates: number[] = responseJson?.date?.map((date: string) =>
    moment(date).valueOf(),
  );

  return dates?.map((date, index) => {
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
};

// HDC API expects a parameter which depends on the layer
// rainfall = rfh; ndvi = vim; blended = rfb
const getVamParam = (serverLayerName: string): string => {
  if (serverLayerName.includes('vim') || serverLayerName.includes('viq')) {
    return 'vim';
  }
  if (serverLayerName.includes('blended')) {
    return 'rfb';
  }
  return 'rfh';
};

export const loadAdminBoundaryDataset = async (
  params: AdminBoundaryRequestParams,
  dispatch: Dispatch,
): Promise<TableData | undefined> => {
  const endDate = moment(params.endDate);
  const startDate = moment(params.startDate);

  const {
    url: hdcUrl,
    level,
    adminCode,
    serverLayerName,
    datasetFields,
  } = params;

  const endDateStr = endDate.format(DEFAULT_DATE_FORMAT);
  const startDateStr = startDate.format(DEFAULT_DATE_FORMAT);

  const hdcRequestParams = {
    level,
    admin_id: adminCode,
    coverage: 'full',
    vam: getVamParam(serverLayerName),
    start: startDateStr,
    end: endDateStr,
  };

  const results = await fetchHDC(
    hdcUrl,
    datasetFields,
    hdcRequestParams,
    dispatch,
  );

  const tableData = createTableData(results, TableDataFormat.DATE);
  return new Promise<TableData>(resolve => resolve(tableData));
};

export const loadDataset = createAsyncThunk<
  TableData | undefined,
  DatasetRequestParams,
  CreateAsyncThunkTypes
>(
  'datasetState/loadDataset',
  async (params: DatasetRequestParams, { dispatch }) => {
    return (params as AdminBoundaryRequestParams).id
      ? loadAdminBoundaryDataset(params as AdminBoundaryRequestParams, dispatch)
      : loadEWSDataset(params as EWSDataPointsRequestParams, dispatch);
  },
);

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
      (
        { ...rest },
        { payload }: PayloadAction<TableData | undefined>,
      ): DatasetState => ({
        ...rest,
        data: payload,
        isLoading: false,
      }),
    );
    builder.addCase(loadDataset.rejected, state => ({
      ...state,
      loading: false,
    }));
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
