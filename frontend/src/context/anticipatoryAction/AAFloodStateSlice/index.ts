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
import { getFloodRiskColor } from './utils';

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
  // dates.json schema: { "YYYY-MM-DD": { trigger_status: string, probabilities_file: string, discharge_file: string, ... } }
  const resp = await fetch(url);
  const datesData: Record<
    string,
    {
      trigger_status?: string;
      probabilities_file?: string;
      discharge_file?: string;
      avg_probabilities_file?: string;
    }
  > = await resp.json();

  const dateKeys = Object.keys(datesData).filter(
    d => d && !Number.isNaN(new Date(`${d}T12:00:00Z`).getTime()),
  );
  // eslint-disable-next-line fp/no-mutating-methods
  const sortedDateKeys = [...dateKeys].sort();
  const normalizeStatus = (raw: string): AAFloodRiskLevelType => {
    const s = raw.toLowerCase();
    switch (true) {
      case s === 'severe': {
        return 'Severe';
      }
      case s === 'moderate': {
        return 'Moderate';
      }
      case s === 'bankfull' || s === 'bank full': {
        return 'Bankfull';
      }
      default: {
        return 'Below bankfull';
      }
    }
  };
  const availableDates: FloodDateItem[] = sortedDateKeys.map(d => {
    const item = datesData[d] || {};
    const status = normalizeStatus(String(item.trigger_status || ''));
    const dt = new Date(`${d}T12:00:00Z`).getTime();
    return {
      displayDate: dt,
      queryDate: dt,
      color: getFloodRiskColor(status),
    } as FloodDateItem;
  });

  // Stations are not provided by dates.json. Return empty until a station source is added.
  return { stations: [], availableDates };
});

export const loadAAFloodDateData = createAsyncThunk<
  {
    selectedDate: string;
    probabilities: Record<string, FloodProbabilityPoint[]>;
    forecast: Record<string, FloodForecastData[]>;
    stations: FloodStation[];
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
  const probUrl = `${baseDir}${dateData.probabilities_file}`;
  const dischargeUrl = `${baseDir}${dateData.discharge_file}`;
  const avgProbUrl = `${baseDir}${dateData.avg_probabilities_file}`;

  const [probRows, dischargeRows, avgProbRows] = await Promise.all([
    parseCsv<any>(probUrl),
    parseCsv<any>(dischargeUrl),
    parseCsv<any>(avgProbUrl),
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

  // removed debug log

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

  // Build station table data from avg_probabilities.csv
  const normalizeStatus = (raw: string): AAFloodRiskLevelType => {
    const s = String(raw || '').toLowerCase();
    switch (true) {
      case s === 'severe': {
        return 'Severe';
      }
      case s === 'moderate': {
        return 'Moderate';
      }
      case s === 'bankfull' || s === 'bank full': {
        return 'Bankfull';
      }
      default: {
        return 'Below bankfull';
      }
    }
  };

  const stationsMap = new Map<string, FloodStation>();
  avgProbRows.forEach((row: any) => {
    const name = startCase(String(row.station_name || '').trim());
    if (!name) {
      return;
    }
    const issueDate = String(row.forecast_issue_date || date);
    const riskLevel = normalizeStatus(row.trigger_status);
    const longitude = Number(row.longitude ?? row.lon ?? 0);
    const latitude = Number(row.latitude ?? row.lat ?? 0);
    const stationData: FloodStationData = {
      station_name: name,
      river_name: String(row.river_name || ''),
      location_id: Number(row.station_id || 0),
      time: issueDate,
      total_members: 0,
      min_discharge: 0,
      max_discharge: 0,
      avg_discharge: 0,
      non_null_values: 0,
      zero_values: 0,
      threshold_bankfull: 0,
      threshold_moderate: 0,
      threshold_severe: 0,
      bankfull_exceeding: Number(row.avg_bankfull_percentage || 0),
      moderate_exceeding: Number(row.avg_moderate_percentage || 0),
      severe_exceeding: Number(row.avg_severe_percentage || 0),
      bankfull_percentage: Number(row.avg_bankfull_percentage || 0),
      moderate_percentage: Number(row.avg_moderate_percentage || 0),
      severe_percentage: Number(row.avg_severe_percentage || 0),
      risk_level: riskLevel,
      max_vs_bankfull_pct: 0,
      avg_vs_bankfull_pct: 0,
    };
    const dateKey = issueDate; // already YYYY-MM-DD
    const existing = stationsMap.get(name);
    if (existing) {
      // eslint-disable-next-line fp/no-mutation
      existing.allData[dateKey] = stationData;
      // eslint-disable-next-line fp/no-mutating-methods
      existing.historicalData.push(stationData);
      // set coordinates if not present yet and valid values exist
      if (
        !existing.coordinates &&
        Number.isFinite(longitude) &&
        Number.isFinite(latitude) &&
        longitude !== 0 &&
        latitude !== 0
      ) {
        // eslint-disable-next-line fp/no-mutation
        existing.coordinates = { latitude, longitude };
      }
      if (
        !existing.currentData ||
        existing.currentData.time < stationData.time
      ) {
        // eslint-disable-next-line fp/no-mutation
        existing.currentData = stationData;
      }
    } else {
      stationsMap.set(name, {
        station_name: name,
        river_name: stationData.river_name,
        location_id: stationData.location_id,
        coordinates:
          Number.isFinite(longitude) &&
          Number.isFinite(latitude) &&
          longitude !== 0 &&
          latitude !== 0
            ? { latitude, longitude }
            : undefined,
        thresholds: { bankfull: 0, moderate: 0, severe: 0 },
        currentData: stationData,
        allData: { [dateKey]: stationData },
        historicalData: [stationData],
      });
    }
  });
  const stations: FloodStation[] = Array.from(stationsMap.values());

  return { selectedDate: date, probabilities, forecast, stations };
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
      stations: payload.stations,
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
