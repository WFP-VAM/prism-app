import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import Papa from 'papaparse';
import { appConfig } from 'config';
import { startCase } from 'lodash';
import type { CreateAsyncThunkTypes, RootState } from '../../store';
import {
  AAFloodView,
  AnticipatoryActionFloodState,
  FloodStation,
  FloodDateItem,
  FloodProbabilityPoint,
  FloodForecastData,
} from './types';
import {
  buildAvailableFloodDatesFromDatesJson,
  normalizeFloodTriggerStatus,
} from './utils';

const initialState: AnticipatoryActionFloodState = {
  stations: [],
  selectedStation: null,
  selectedDate: null,
  forecastData: {},
  probabilitiesData: {},
  stationSummaryData: {},
  availableDates: [],
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
  // dates.json schema: { "YYYY-MM-DD": { trigger_status: string, probabilities_file: string, discharge_file: string, ... } }
  const resp = await fetch(url);
  const datesData: Record<
    string,
    {
      trigger_status?: string;
      probabilities_file?: string;
      discharge_file?: string;
      station_summary_file?: string;
    }
  > = await resp.json();

  const availableDates: FloodDateItem[] =
    buildAvailableFloodDatesFromDatesJson(datesData);

  // Stations are not provided by dates.json. Return empty until a station source is added.
  return { stations: [], availableDates };
});

export const loadAAFloodDateData = createAsyncThunk<
  {
    selectedDate: string;
    probabilities: Record<string, FloodProbabilityPoint[]>;
    forecast: Record<string, FloodForecastData[]>;
    stations: FloodStation[];
    stationSummary: Record<string, FloodStation>;
  },
  { date: string },
  CreateAsyncThunkTypes
>('anticipatoryActionFloodState/loadAAFloodDateData', async ({ date }) => {
  const datesUrl = appConfig.anticipatoryActionFloodUrl; // probabilities base
  if (!datesUrl) {
    throw new Error('Flood probabilities URL not configured');
  }
  // Build base path from dates.json URL
  const baseDir = datesUrl.replace(/dates\.json$/i, '');

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

  const datesResponse = await fetch(datesUrl);
  const datesData = await datesResponse.json();
  const dateData = datesData[date];
  if (!dateData) {
    throw new Error(`No data entry found for date ${date}`);
  }

  const [probRows, dischargeRows, summaryRows] = await Promise.all([
    parseCsv<any>(`${baseDir}${dateData.probabilities_file}`),
    parseCsv<any>(`${baseDir}${dateData.discharge_file}`),
    parseCsv<any>(`${baseDir}${dateData.station_summary_file}`),
  ]);

  // probabilities.csv schema: station_id,station_name,river_name,longitude,latitude,forecast_issue_date,valid_time,bankfull_percentage,moderate_percentage,severe_percentage
  const probabilities: Record<string, FloodProbabilityPoint[]> =
    probRows.reduce(
      (acc: Record<string, FloodProbabilityPoint[]>, row: any) => {
        const key: string = startCase(
          String(row.station_name || row.station_id || '').trim(),
        );
        if (!key) {
          return acc;
        }
        const point: FloodProbabilityPoint = {
          time: String(row.valid_time ?? row.time ?? ''),
          bankfullPercentage: Number(row.bankfull_percentage ?? 0) * 100,
          moderatePercentage: Number(row.moderate_percentage ?? 0) * 100,
          severePercentage: Number(row.severe_percentage ?? 0) * 100,
          thresholdBankfull: Number(
            Number(row.threshold_bankfull ?? 0).toFixed(2),
          ),
          thresholdModerate: Number(
            Number(row.threshold_moderate ?? 0).toFixed(2),
          ),
          thresholdSevere: Number(Number(row.threshold_severe ?? 0).toFixed(2)),
        };
        const prev = acc[key] || [];
        return {
          ...acc,
          [key]: [...prev, point],
        };
      },
      {},
    );

  // discharge.csv schema: station_id,station_name,river_name,lon,lat,forecast_issue_date,valid_time,discharge,ensemble_member
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
        String(row.station_name || row.station_id || '').trim(),
      );
      if (!key) {
        return acc;
      }
      const entry = {
        time: String(row.valid_time ?? ''),
        member: Number(row.ensemble_member ?? row.member ?? 0),
        discharge: Number(row.discharge ?? 0),
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

    const seriesSorted = [...series].sort((a, b) => {
      const ta = new Date(a.time).getTime();
      const tb = new Date(b.time).getTime();
      if (ta !== tb) {
        return ta - tb;
      }
      return a.member - b.member;
    });
    const times = Array.from(new Set(seriesSorted.map(s => s.time)));

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

  // Build stations with summary data
  const stationSummary = summaryRows.reduce(
    (acc: Record<string, FloodStation>, row: any) => {
      const key: string = startCase(String(row.station_name || '').trim());
      if (!key || !row.longitude || !row.latitude) {
        return acc;
      }
      return {
        ...acc,
        [key]: {
          station_name: key,
          station_id: Number(row.station_id || 0),
          river_name: String(row.river_name || ''),
          longitude: Number(row.longitude ?? 0),
          latitude: Number(row.latitude ?? 0),
          forecast_issue_date: String(row.forecast_issue_date || date),
          window_begin: String(row.window_begin || ''),
          window_end: String(row.window_end || ''),
          avg_bankfull_percentage:
            typeof row.avg_bankfull_percentage === 'number'
              ? Number(row.avg_bankfull_percentage) * 100
              : undefined,
          avg_moderate_percentage:
            typeof row.avg_moderate_percentage === 'number'
              ? Number(row.avg_moderate_percentage) * 100
              : undefined,
          avg_severe_percentage:
            typeof row.avg_severe_percentage === 'number'
              ? Number(row.avg_severe_percentage) * 100
              : undefined,
          trigger_bankfull:
            typeof row.trigger_bankfull === 'number'
              ? Number(row.trigger_bankfull) * 100
              : undefined,
          trigger_moderate:
            typeof row.trigger_moderate === 'number'
              ? Number(row.trigger_moderate) * 100
              : undefined,
          trigger_severe:
            typeof row.trigger_severe === 'number'
              ? Number(row.trigger_severe) * 100
              : undefined,
          trigger_status: normalizeFloodTriggerStatus(
            String(row.trigger_status ?? ''),
          ),
        },
      };
    },
    {},
  );

  // Extract basic station info for the stations array
  const stations: FloodStation[] = Object.values(stationSummary).map(
    station => ({
      station_name: station.station_name,
      station_id: station.station_id,
      river_name: station.river_name,
      longitude: station.longitude,
      latitude: station.latitude,
    }),
  );

  return {
    selectedDate: date,
    probabilities,
    forecast,
    stations,
    stationSummary,
  };
});

export const anticipatoryActionFloodStateSlice = createSlice({
  name: 'anticipatoryActionFloodState',
  initialState,
  reducers: {
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
      stations: payload.stations,
      probabilitiesData: {
        ...state.probabilitiesData,
        ...payload.probabilities,
      },
      forecastData: {
        ...state.forecastData,
        ...payload.forecast,
      },
      stationSummaryData: {
        ...state.stationSummaryData,
        ...payload.stationSummary,
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

export const { setAAFloodSelectedStation, setAAFloodView } =
  anticipatoryActionFloodStateSlice.actions;

export default anticipatoryActionFloodStateSlice.reducer;
