import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  CoverageEndDateTimestamp,
  CoverageStartDateTimestamp,
  DateItem,
  DisplayDateTimestamp,
  QueryDateTimestamp,
} from 'config/types';
import { StormDataResponseBody } from 'prism-common/';
import type { CreateAsyncThunkTypes, RootState } from '../../store';
import { AAStormWindStateReports, AnticipatoryActionState } from './types';
import { parseAndTransformAA } from './utils';
import { ParsedStormData } from './parsedStormDataTypes';

const initialState: AnticipatoryActionState = {
  data: {},
  windStateReports: {},
  availableDates: undefined,
  selectedStormName: undefined,
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
    data: ParsedStormData;
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
      const data = parseAndTransformAA(stormData as StormDataResponseBody);
      return data;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const loadStormReport = createAsyncThunk<
  {
    data: ParsedStormData;
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
      const data = parseAndTransformAA(stormData as StormDataResponseBody);
      return data;
    } catch (error) {
      console.error(
        'Stack trace:',
        error instanceof Error ? error.stack : 'No stack trace available',
      );
      return rejectWithValue(error);
    }
  },
);

// Update the DateItem type import or extend it locally
export type ExtendedDateItem = DateItem & {
  stormNames: string[];
};

export const loadWindStateReports = createAsyncThunk<
  { reports: AAStormWindStateReports; availableDates: ExtendedDateItem[] },
  undefined,
  CreateAsyncThunkTypes & {
    rejectValue: unknown;
  }
>(
  'anticipatoryActionStormState/loadWindStateReports',
  async (_, { rejectWithValue }) => {
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
          displayDate: timestamp as DisplayDateTimestamp,
          queryDate: timestamp as QueryDateTimestamp,
          startDate: timestamp as CoverageStartDateTimestamp,
          endDate: timestamp as CoverageEndDateTimestamp,
          stormNames: Object.keys(responseData[dateStr]),
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
  reducers: {
    setSelectedStormName: (
      state,
      { payload }: PayloadAction<AnticipatoryActionState['selectedStormName']>,
    ) => ({
      ...state,
      selectedStormName: payload,
    }),
  },
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

export const { setSelectedStormName } =
  anticipatoryActionStormStateSlice.actions;

export const AASelectedStormNameSelector = (state: RootState) =>
  state.anticipatoryActionStormState.selectedStormName;

export default anticipatoryActionStormStateSlice.reducer;
