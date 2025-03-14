import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import Papa from 'papaparse';
import { DateItem } from 'config/types';
import { appConfig } from 'config';
import { AAWindowKeys } from 'config/utils';
import { getCurrentDateTimeForUrl } from 'utils/date-utils';
import type { CreateAsyncThunkTypes, RootState } from '../../store';
import {
  AACategoryType,
  AAView,
  AnticipatoryActionData,
  AnticipatoryActionState,
  Vulnerability,
  allWindowsKey,
} from './types';
import {
  calculateMapRenderedDistricts,
  emptyWindows,
  parseAndTransformAA,
} from './utils';

const initialState: AnticipatoryActionState = {
  data: emptyWindows,
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
      Normal: true,
      na: true,
      ny: true,
    },
  },
  markers: [],
  selectedDistrict: '',
  renderedDistricts: emptyWindows,
  windowRanges: { 'Window 1': undefined, 'Window 2': undefined },
  view: AAView.Home,
  loading: false,
  error: null,
};

export const loadAAData = createAsyncThunk<
  {
    windowData: {
      data: AnticipatoryActionData;
      availableDates: DateItem[];
      windowKey: (typeof AAWindowKeys)[number];
      range: { start: string; end: string };
    }[];
    monitoredDistricts: { name: string; vulnerability: Vulnerability }[];
  },
  undefined,
  CreateAsyncThunkTypes
>('anticipatoryActionDroughtState/loadAAData', async () => {
  const url = `${appConfig.anticipatoryActionDroughtUrl}?date=${getCurrentDateTimeForUrl()}`;

  return new Promise<any>((resolve, reject) => {
    Papa.parse(url, {
      header: true,
      download: true,
      complete: results => resolve(parseAndTransformAA(results.data)),
      error: error => reject(error),
    });
  });
});

export const anticipatoryActionDroughtStateSlice = createSlice({
  name: 'anticipatoryActionDroughtState',
  initialState,
  reducers: {
    setAAFilters: (
      state,
      {
        payload,
      }: PayloadAction<
        Partial<{
          viewType: 'forecast' | 'risk';
          selectedDate: string | undefined;
          selectedWindow: (typeof AAWindowKeys)[number] | typeof allWindowsKey;
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
          windowRanges: state.windowRanges,
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
    setAAView: (
      state,
      { payload }: PayloadAction<AnticipatoryActionState['view']>,
    ) => ({
      ...state,
      view: payload,
    }),
  },
  extraReducers: builder => {
    builder.addCase(loadAAData.fulfilled, (state, { payload }) => {
      const newData = Object.fromEntries(
        payload.windowData.map(x => [x.windowKey, x.data]),
      ) as Record<(typeof AAWindowKeys)[number], AnticipatoryActionData>;
      const newRanges = Object.fromEntries(
        payload.windowData.map(x => [x.windowKey, x.range]),
      ) as Record<
        (typeof AAWindowKeys)[number],
        { start: string; end: string }
      >;
      return {
        ...state,
        loading: false,
        data: newData,
        availableDates: Object.fromEntries(
          payload.windowData.map(x => [x.windowKey, x.availableDates]),
        ) as Record<(typeof AAWindowKeys)[number], DateItem[]>,
        windowRanges: newRanges,
        monitoredDistricts: payload.monitoredDistricts,
        renderedDistricts: calculateMapRenderedDistricts({
          filters: state.filters,
          data: newData,
          windowRanges: newRanges,
        }),
      };
    });

    builder.addCase(loadAAData.rejected, (state, action) => ({
      ...state,
      loading: false,
      error: action.error.message
        ? action.error.message
        : action.error.toString(),
    }));

    builder.addCase(loadAAData.pending, ({ error: _error, ...state }) => ({
      ...state,
      error: null,
      loading: true,
    }));
  },
});

// export selectors
export const AADataSelector = (state: RootState) =>
  state.anticipatoryActionDroughtState.data;

export const AAAvailableDatesSelector = (state: RootState) =>
  state.anticipatoryActionDroughtState.availableDates;

export const AAMonitoredDistrictsSelector = (state: RootState) =>
  state.anticipatoryActionDroughtState.monitoredDistricts;

export const AAFiltersSelector = (state: RootState) =>
  state.anticipatoryActionDroughtState.filters;

export const AARenderedDistrictsSelector = (state: RootState) =>
  state.anticipatoryActionDroughtState.renderedDistricts;

export const AASelectedDistrictSelector = (state: RootState) =>
  state.anticipatoryActionDroughtState.selectedDistrict;

export const AAMarkersSelector = (state: RootState) =>
  state.anticipatoryActionDroughtState.markers;

export const AAViewSelector = (state: RootState) =>
  state.anticipatoryActionDroughtState.view;

export const AAWindowRangesSelector = (state: RootState) =>
  state.anticipatoryActionDroughtState.windowRanges;

// export actions
export const { setAAFilters, setAASelectedDistrict, setAAMarkers, setAAView } =
  anticipatoryActionDroughtStateSlice.actions;

export default anticipatoryActionDroughtStateSlice.reducer;
