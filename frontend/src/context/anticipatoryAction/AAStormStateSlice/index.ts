import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { DateItem } from 'config/types';
import type { CreateAsyncThunkTypes, RootState } from '../../store';
import {
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
  loading: false,
  error: null,
};

export const loadAllAAStormData = createAsyncThunk<
  boolean,
  undefined,
  CreateAsyncThunkTypes
>('anticipatoryActionStormState/loadAllData', async (_, { dispatch }) => {
  dispatch(loadWindStateReports());
  return true;
});

export const loadLatestStormReport = createAsyncThunk<
  {
    data: AAStormData;
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
  },
  { stormName: string; date: string },
  CreateAsyncThunkTypes
>(
  'anticipatoryActionStormState/loadStormReport',
  async ({ stormName, date }, { rejectWithValue }) => {
    if (!stormName || !date) {
      // eslint-disable-next-line no-console
      console.warn('Storm name and date are required');
      return rejectWithValue(new Error('Storm name and date are required'));
    }
    try {
      const response = await fetch(
        `https://data.earthobservation.vam.wfp.org/public-share/aa/ts/outputs/${stormName}/${date}.json?v2`,
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
  { reports: AAStormWindStateReports; availableDates: DateItem[] },
  undefined,
  CreateAsyncThunkTypes & {
    rejectValue: unknown;
  }
>(
  'anticipatoryActionStormState/loadWindStateReports',
  async (
    _,
    { rejectWithValue },
  ): Promise<
    | {
        reports: AAStormWindStateReports;
        availableDates: DateItem[];
      }
    | any
  > => {
    try {
      const response = await fetch(
        'https://data.earthobservation.vam.wfp.org/public-share/aa/ts/outputs/dates.json',
      );
      const responseData = await response.json();
      const availableDates = Object.keys(responseData).map(dateStr => {
        // Parse the date string as UTC
        // eslint-disable-next-line prefer-template
        const utcDate = new Date(dateStr + 'T12:00:00.000Z');
        const timestamp = utcDate.getTime();
        return {
          displayDate: timestamp,
          queryDate: timestamp,
          startDate: timestamp,
          endDate: timestamp,
        };
      });
      return {
        reports: responseData,
        availableDates,
      };
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const anticipatoryActionStormStateSlice = createSlice({
  name: 'anticipatoryActionStormState',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(loadStormReport.fulfilled, (state, { payload }) => ({
      ...state,
      loading: false,
      data: payload.data,
    }));

    builder.addCase(loadStormReport.rejected, (state, action) => ({
      ...state,
      loading: false,
      error: action.error.message
        ? action.error.message
        : action.error.toString(),
    }));

    builder.addCase(loadStormReport.pending, ({ error: _error, ...state }) => ({
      ...state,
      error: null,
      loading: true,
    }));
    builder.addCase(loadWindStateReports.fulfilled, (state, { payload }) => ({
      ...state,
      loading: false,
      windStateReports: payload.reports,
      availableDates: payload.availableDates,
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

export const AALoadingSelector = (state: RootState) =>
  state.anticipatoryActionStormState.loading;

export const AAAvailableDatesSelector = (state: RootState) =>
  state.anticipatoryActionStormState.availableDates;

export const AAWindStateReports = (state: RootState) =>
  state.anticipatoryActionStormState.windStateReports;

export default anticipatoryActionStormStateSlice.reducer;
