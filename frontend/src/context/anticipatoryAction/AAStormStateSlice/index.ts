import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DateItem } from 'config/types';
import type { CreateAsyncThunkTypes, RootState } from '../../store';
import {
  AACategory,
  AAStormData,
  AAStormWindStateReports,
  AnticipatoryActionState,
  StormData,
} from './types';
import { parseAndTransformAA } from './utils';

const initialState: AnticipatoryActionState = {
  data: {},
  windStateReports: {},
  availableDates: undefined,
  filters: {
    selectedDate: undefined,
    selectedIndex: '',
    categories: {
      Severe: true,
      Moderate: true,
      Risk: true,
    },
  },
  loading: false,
  error: null,
};

export const loadAllAAStormData = createAsyncThunk<
  boolean,
  undefined,
  CreateAsyncThunkTypes
>('anticipatoryActionStormState/loadAllData', async (_, { dispatch }) => {
  dispatch(loadLatestStormReport());
  dispatch(loadWindStateReports());
  return true;
});

export const loadLatestStormReport = createAsyncThunk<
  {
    data: AAStormData;
    availableDates: DateItem[];
  },
  undefined,
  CreateAsyncThunkTypes
>(
  'anticipatoryActionStormState/loadLatestStormReport',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(
        'https://data.earthobservation.vam.wfp.org/public-share/aa/ts/outputs/latest.json',
      );
      const stormData = await response.json();
      const data = parseAndTransformAA(stormData as StormData);
      return data;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const loadStormReport = createAsyncThunk<
  {
    data: AAStormData;
    availableDates: DateItem[];
  },
  { stormName: string; date: string },
  CreateAsyncThunkTypes
>(
  'anticipatoryActionStormState/loadLatestStormReport',
  async ({ stormName, date }, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `https://data.earthobservation.vam.wfp.org/public-share/aa/ts/outputs/${stormName}/${date}.json`,
      );
      const stormData = await response.json();
      const data = parseAndTransformAA(stormData as StormData);
      return data;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const loadWindStateReports = createAsyncThunk<
  AAStormWindStateReports,
  undefined,
  CreateAsyncThunkTypes
>(
  'anticipatoryActionStormState/loadWindStateReports',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(
        'https://data.earthobservation.vam.wfp.org/public-share/aa/ts/outputs/dates.json',
      );
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const anticipatoryActionStormStateSlice = createSlice({
  name: 'anticipatoryActionStormState',
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
          selectedIndex: string;
          categories: Partial<Record<AACategory, boolean>>;
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
      };
    },
  },
  extraReducers: builder => {
    builder.addCase(loadLatestStormReport.fulfilled, (state, { payload }) => ({
      ...state,
      loading: false,
      data: payload.data,
      availableDates: payload.availableDates,
    }));

    builder.addCase(loadLatestStormReport.rejected, (state, action) => ({
      ...state,
      loading: false,
      error: action.error.message
        ? action.error.message
        : action.error.toString(),
    }));

    builder.addCase(
      loadLatestStormReport.pending,
      ({ error: _error, ...state }) => ({
        ...state,
        error: null,
        loading: true,
      }),
    );
    builder.addCase(loadWindStateReports.fulfilled, (state, { payload }) => ({
      ...state,
      loading: false,
      windStateReports: payload,
    }));

    builder.addCase(loadWindStateReports.rejected, (state, action) => ({
      ...state,
      loading: false,
      error: action.error.message
        ? action.error.message
        : action.error.toString(),
    }));

    builder.addCase(
      loadWindStateReports.pending,
      ({ error: _error, ...state }) => ({
        ...state,
        error: null,
        loading: true,
      }),
    );
  },
});

// export selectors
export const AADataSelector = (state: RootState) =>
  state.anticipatoryActionStormState.data;

export const AAAvailableDatesSelector = (state: RootState) =>
  state.anticipatoryActionStormState.availableDates;

export const AAFiltersSelector = (state: RootState) =>
  state.anticipatoryActionStormState.filters;

export const AAWindStateReports = (state: RootState) =>
  state.anticipatoryActionStormState.windStateReports;

// export actions
export const { setAAFilters } = anticipatoryActionStormStateSlice.actions;

export default anticipatoryActionStormStateSlice.reducer;
