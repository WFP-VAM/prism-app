import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import Papa from 'papaparse';
import { appConfig } from 'config';
import type { CreateAsyncThunkTypes, RootState } from '../../store';
import {
  AAFloodRiskLevelType,
  AAFloodView,
  AnticipatoryActionFloodState,
  FloodStation,
  FloodStationData,
  FloodDateItem,
} from './types';
import { parseAndTransformFloodData } from './utils';

const initialState: AnticipatoryActionFloodState = {
  stations: [],
  selectedStation: null,
  selectedDate: null,
  forecastData: {},
  historicalData: {},
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
