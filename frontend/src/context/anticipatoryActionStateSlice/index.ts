import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import Papa from 'papaparse';
import { DateItem } from 'config/types';
import { appConfig } from 'config';
import { AAWindowKeyToLayerId, AAWindowKeys } from 'config/utils';
import type { CreateAsyncThunkTypes, RootState } from '../store';
import {
  AACategoryType,
  AnticipatoryActionData,
  AnticipatoryActionState,
  allWindowsKey,
} from './types';
import {
  calculateMapRenderedDistricts,
  emptyWindows,
  parseAndTransformAA,
} from './utils';

const initialState: AnticipatoryActionState = {
  data: { 'Window 1': {}, 'Window 2': {} },
  availableDates: undefined,
  monitoredDistricts: [],
  filters: {
    selectedDate: undefined,
    selectedWindow: allWindowsKey,
    selectedIndex: '',
    categories: {
      Severe: true,
      Moderate: true,
      Mild: true,
      na: true,
      ny: true,
    },
  },
  markers: [],
  selectedDistrict: '',
  renderedDistricts: emptyWindows,
  loading: false,
  error: null,
};

export const loadAAData = createAsyncThunk<
  {
    windowData: {
      data: AnticipatoryActionData;
      availableDates: DateItem[];
      windowKey: typeof AAWindowKeys[number];
    }[];
    monitoredDistricts: string[];
  },
  undefined,
  CreateAsyncThunkTypes
>('anticipatoryActionState/loadAAData', async () => {
  const url = appConfig.anticipatoryActionUrl;

  return new Promise<any>((resolve, reject) =>
    Papa.parse(url, {
      header: true,
      download: true,
      complete: results => resolve(parseAndTransformAA(results.data)),
      error: error => reject(error),
    }),
  );
});

export const anticipatoryActionStateSlice = createSlice({
  name: 'anticipatoryActionState',
  initialState,
  reducers: {
    setAAFilters: (
      state,
      {
        payload,
      }: PayloadAction<
        Partial<{
          selectedDate: string | undefined;
          selectedWindow: typeof AAWindowKeys[number] | typeof allWindowsKey;
          selectedIndex: string;
          categories: Partial<Record<AACategoryType, boolean>>;
        }>
      >,
    ) => {
      const { categories, ...rest } = payload;
      const newCategories =
        categories !== undefined
          ? { ...state.filters.categories, ...categories }
          : state.filters.categories;
      const newFilters = {
        ...state.filters,
        ...rest,
        categories: newCategories,
      };
      return {
        ...state,
        filters: newFilters,
        renderedDistricts: calculateMapRenderedDistricts({
          filters: newFilters,
          data: state.data,
        }),
      };
    },
    setAASelectedDistrict: (
      state,
      { payload }: PayloadAction<AnticipatoryActionState['selectedDistrict']>,
    ) => ({
      ...state,
      selectedDistrict: payload,
    }),
    setAAMarkers: (
      state,
      { payload }: PayloadAction<AnticipatoryActionState['markers']>,
    ) => ({
      ...state,
      markers: payload,
    }),
  },
  extraReducers: builder => {
    builder.addCase(loadAAData.fulfilled, (state, { payload }) => ({
      ...state,
      loading: false,
      data: Object.fromEntries(
        payload.windowData.map(x => [x.windowKey, x.data]),
      ) as Record<typeof AAWindowKeys[number], AnticipatoryActionData>,
      availableDates: Object.fromEntries(
        payload.windowData.map(x => [
          AAWindowKeyToLayerId[x.windowKey],
          x.availableDates,
        ]),
      ),
      monitoredDistricts: payload.monitoredDistricts,
    }));

    builder.addCase(loadAAData.rejected, (state, action) => ({
      ...state,
      loading: false,
      error: action.error.message
        ? action.error.message
        : action.error.toString(),
    }));

    builder.addCase(loadAAData.pending, ({ error, ...state }) => ({
      ...state,
      error: null,
      loading: true,
    }));
  },
});

// export selectors
export const AADataSelector = (state: RootState) =>
  state.anticipatoryActionState.data;

export const AAAvailableDatesSelector = (state: RootState) =>
  state.anticipatoryActionState.availableDates;

export const AAMonitoredDistrictsSelector = (state: RootState) =>
  state.anticipatoryActionState.monitoredDistricts;

export const AAFiltersSelector = (state: RootState) =>
  state.anticipatoryActionState.filters;

export const AARenderedDistrictsSelector = (state: RootState) =>
  state.anticipatoryActionState.renderedDistricts;

export const AASelectedDistrictSelector = (state: RootState) =>
  state.anticipatoryActionState.selectedDistrict;

export const AAMarkersSelector = (state: RootState) =>
  state.anticipatoryActionState.markers;

// export actions
export const {
  setAAFilters,
  setAASelectedDistrict,
  setAAMarkers,
} = anticipatoryActionStateSlice.actions;

export default anticipatoryActionStateSlice.reducer;
