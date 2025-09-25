import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import Papa from 'papaparse';
import { appConfig } from 'config';
import { startCase } from 'lodash';
import type { CreateAsyncThunkTypes, RootState } from '../../store';
import {
  AAFloodRiskLevelType,
  AAFloodView,
  AnticipatoryActionFloodState,
  FloodStation,
  FloodStationData,
  FloodDateItem,
  FloodProbabilityPoint,
  FloodForecastData,
} from './types';
import { parseAndTransformFloodData } from './utils';

const initialState: AnticipatoryActionFloodState = {
  stations: [],
  selectedStation: null,
  selectedDate: null,
  forecastData: {},
  historicalData: {},
  probabilitiesData: {},
  availableDates: [],
  filters: {
    selectedDate: null,
    selectedStation: null,
    riskLevels: {
      'Below bankfull': true,
      Bankfull: true,
      Moderate: true,
      Severe: true,
    },
  },
  view: AAFloodView.Home,
  loading: false,
  error: null,
};

export const loadAAFloodData = createAsyncThunk<
  {
    stations: FloodStation[];
    availableDates: FloodDateItem[];
  },
  void,
  CreateAsyncThunkTypes
>('anticipatoryActionFloodState/loadAAFloodData', async () => {
  const url = appConfig.anticipatoryActionFloodUrl;
  if (!url) {
    throw new Error('Flood data URL not configured');
  }

  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      complete: results => {
        try {
          const { stations, availableDates } = parseAndTransformFloodData(
            results.data as FloodStationData[],
          );
          resolve({ stations, availableDates });
        } catch (error) {
          reject(error);
        }
      },
      error: error => reject(error),
    });
  });
});

export const loadAAFloodDateData = createAsyncThunk<
  {
    selectedDate: string;
    probabilities: Record<string, FloodProbabilityPoint[]>;
    forecast: Record<string, FloodForecastData[]>;
  },
  { date: string },
  CreateAsyncThunkTypes
>('anticipatoryActionFloodState/loadAAFloodDateData', async ({ date }) => {
  const baseProbUrl = appConfig.anticipatoryActionFloodUrl; // probabilities base
  if (!baseProbUrl) {
    throw new Error('Flood probabilities URL not configured');
  }
  const probUrl = `${baseProbUrl}?date=${date}`;
  const dischargeUrl = `http://data.earthobservation.vam.wfp.org/public-share/aa/flood/moz/discharge.csv?date=${date}`;

  const parseCsv = <T>(url: string) =>
    new Promise<T[]>((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: results => resolve(results.data as T[]),
        error: error => reject(error),
      });
    });

  const [probRows, dischargeRows] = await Promise.all([
    parseCsv<any>(probUrl),
    parseCsv<any>(dischargeUrl),
  ]);

  // probabilities.csv schema: location_id,station_name,river_name,longitude,latitude,forecast_issue_date,valid_time,bankfull_percentage,moderate_percentage,severe_percentage
  const probabilities: Record<string, FloodProbabilityPoint[]> =
    probRows.reduce(
      (acc: Record<string, FloodProbabilityPoint[]>, row: any) => {
        const key: string = startCase(
          String(row.station_name || row.location_id || '').trim(),
        );
        if (!key) {
          return acc;
        }
        // TODO: cleanup mock data
        const point: FloodProbabilityPoint = {
          time: String(row.valid_time ?? row.time ?? ''),
          bankfull_percentage:
            Number(row.bankfull_percentage ?? row.bankfull ?? 0) -
            Math.random() * 100,
          moderate_percentage:
            Number(row.moderate_percentage ?? row.moderate ?? 0) -
            Math.random() * 100,
          severe_percentage:
            Number(row.severe_percentage ?? row.severe ?? 0) -
            Math.random() * 100,
        };
        const prev = acc[key] || [];
        return {
          ...acc,
          [key]: [...prev, point],
        };
      },
      {},
    );

  // discharge.csv schema: location_id,station_name,river_name,lon,lat,forecast_issue_date,valid_time,discharge,ensemble_member
  // Build for each station an array of ensembles across lead times.
  // We'll map valid_time order to 0..N lead-time indices based on ascending date.
  const dischargeByStation: Record<
    string,
    { time: string; member: number; discharge: number }[]
  > = dischargeRows.reduce(
    (
      acc: Record<
        string,
        { time: string; member: number; discharge: number }[]
      >,
      row: any,
    ) => {
      const key: string = startCase(
        String(row.station_name || row.location_id || '').trim(),
      );
      if (!key) {
        return acc;
      }
      const entry = {
        time: String(row.valid_time ?? ''),
        member: Number(row.ensemble_member ?? row.member ?? 0),
        // TODO: cleanup mock data
        discharge: Number(row.discharge ?? 0) + 500 + Math.random() * 100,
      };
      const prev = acc[key] || [];
      return {
        ...acc,
        [key]: [...prev, entry],
      };
    },
    {},
  );

  // For charts we want per lead-time arrays of members; return raw grouped structure
  const forecast: Record<string, FloodForecastData[]> = Object.keys(
    dischargeByStation,
  ).reduce((acc: Record<string, FloodForecastData[]>, station) => {
    const series = dischargeByStation[station];
    // eslint-disable-next-line fp/no-mutating-methods
    const seriesSorted = [...series].sort((a, b) => {
      const ta = new Date(a.time).getTime();
      const tb = new Date(b.time).getTime();
      if (ta !== tb) {
        return ta - tb;
      }
      return a.member - b.member;
    });
    const times = Array.from(new Set(seriesSorted.map(s => s.time)));
    // eslint-disable-next-line fp/no-mutating-methods
    const members = Array.from(new Set(seriesSorted.map(s => s.member))).sort(
      (a, b) => a - b,
    );
    const data: FloodForecastData[] = times.map(t => {
      const rowsAtT = seriesSorted.filter(s => s.time === t);
      const membersData = members.map(
        m => rowsAtT.find(s => s.member === m)?.discharge ?? 0,
      );
      return {
        station_name: station,
        time: t,
        ensemble_members: membersData,
      };
    });
    return { ...acc, [station]: data };
  }, {});

  return { selectedDate: date, probabilities, forecast };
});

export const anticipatoryActionFloodStateSlice = createSlice({
  name: 'anticipatoryActionFloodState',
  initialState,
  reducers: {
    setAAFloodFilters: (
      state,
      {
        payload,
      }: PayloadAction<
        Partial<{
          selectedDate: string | null;
          selectedStation: string | null;
          riskLevels: Partial<Record<AAFloodRiskLevelType, boolean>>;
        }>
      >,
    ) => {
      const { riskLevels, ...rest } = payload;
      const newRiskLevels =
        riskLevels !== undefined
          ? { ...state.filters.riskLevels, ...riskLevels }
          : state.filters.riskLevels;
      const newFilters = {
        ...state.filters,
        ...rest,
        riskLevels: newRiskLevels,
      };
      return {
        ...state,
        filters: newFilters,
      };
    },
    setAAFloodSelectedStation: (
      state,
      { payload }: PayloadAction<string | null>,
    ) => ({
      ...state,
      selectedStation: payload,
    }),
    setAAFloodView: (state, { payload }: PayloadAction<AAFloodView>) => ({
      ...state,
      view: payload,
    }),
  },
  extraReducers: builder => {
    builder.addCase(loadAAFloodData.fulfilled, (state, { payload }) => ({
      ...state,
      loading: false,
      stations: payload.stations,
      availableDates: payload.availableDates,
    }));

    builder.addCase(loadAAFloodData.rejected, (state, action) => ({
      ...state,
      loading: false,
      error: action.error.message
        ? action.error.message
        : action.error.toString(),
    }));

    builder.addCase(loadAAFloodData.pending, ({ error: _error, ...state }) => ({
      ...state,
      error: null,
      loading: true,
    }));

    builder.addCase(loadAAFloodDateData.fulfilled, (state, { payload }) => ({
      ...state,
      loading: false,
      selectedDate: payload.selectedDate,
      probabilitiesData: {
        ...state.probabilitiesData,
        ...payload.probabilities,
      },
      forecastData: {
        ...state.forecastData,
        ...payload.forecast,
      },
    }));

    builder.addCase(loadAAFloodDateData.rejected, (state, action) => ({
      ...state,
      loading: false,
      error: action.error.message
        ? action.error.message
        : action.error.toString(),
    }));

    builder.addCase(
      loadAAFloodDateData.pending,
      ({ error: _error, ...state }) => ({
        ...state,
        error: null,
        loading: true,
      }),
    );
  },
});

// Export selectors
export const AAFloodDataSelector = (state: RootState) =>
  state.anticipatoryActionFloodState;

export const AAFloodAvailableDatesSelector = (state: RootState) =>
  state.anticipatoryActionFloodState.availableDates;

export const { setAAFloodFilters, setAAFloodSelectedStation, setAAFloodView } =
  anticipatoryActionFloodStateSlice.actions;

export default anticipatoryActionFloodStateSlice.reducer;
