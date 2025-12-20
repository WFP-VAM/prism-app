import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { ReferenceDateTimestamp, UserAuth } from 'config/types';
import {
  preloadLayerDatesForPointData,
  preloadLayerDatesForWMS,
  clearPointDataFetchCache,
} from 'utils/server-utils';
import type { CreateAsyncThunkTypes, RootState } from './store';

type ServerPreloadState = {
  // these are reference dates
  WMSLayerDates: Record<string, ReferenceDateTimestamp[]>;
  // these are reference dates
  pointDataLayerDates: Record<string, ReferenceDateTimestamp[]>;
  loadingWMS: boolean;
  loadingPointData: boolean;
  loadedWMS: boolean;
  loadedPointData: boolean;
  error?: string;
  userAuth?: UserAuth;
};

const initialState: ServerPreloadState = {
  WMSLayerDates: {},
  pointDataLayerDates: {},
  loadingWMS: false,
  loadingPointData: false,
  loadedWMS: false,
  loadedPointData: false,
};

export const preloadLayerDatesArraysForWMS = createAsyncThunk<
  Record<string, ReferenceDateTimestamp[]>,
  void,
  CreateAsyncThunkTypes
>(
  'serverState/preloadLayerDatesForWMS',
  async (_, { dispatch }) => preloadLayerDatesForWMS(dispatch),
  {
    condition: (_, { getState }) => !WMSLayerDatesRequested(getState()),
  },
);

export const preloadLayerDatesArraysForPointData = createAsyncThunk<
  Record<string, ReferenceDateTimestamp[]>,
  void,
  CreateAsyncThunkTypes
>(
  'serverState/preloadLayerDatesForPointData',
  async (_, { dispatch, getState }) => {
    const state = getState();
    const userAuth = state.serverState.userAuth;
    return preloadLayerDatesForPointData(dispatch, userAuth);
  },
  {
    condition: (_, { getState }) => !pointDataLayerDatesRequested(getState()),
  },
);

// Thunk to re-fetch dates when user logs in (bypasses condition check)
export const refetchLayerDatesArraysForPointData = createAsyncThunk<
  Record<string, ReferenceDateTimestamp[]>,
  void,
  CreateAsyncThunkTypes
>(
  'serverState/refetchLayerDatesForPointData',
  async (_, { dispatch, getState }) => {
    const state = getState();
    const userAuth = state.serverState.userAuth;
    // Clear cache to force re-fetch with new authentication
    clearPointDataFetchCache();
    return preloadLayerDatesForPointData(dispatch, userAuth);
  },
);

export const serverPreloadStateSlice = createSlice({
  name: 'serverPreloadState',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(
      preloadLayerDatesArraysForWMS.fulfilled,
      (
        state,
        { payload }: PayloadAction<Record<string, ReferenceDateTimestamp[]>>,
      ) => ({
        ...state,
        loadingWMS: false,
        loadedWMS: true,
        WMSLayerDates: {
          ...state.WMSLayerDates,
          ...payload,
        },
      }),
    );

    builder.addCase(
      preloadLayerDatesArraysForWMS.rejected,
      (state, action) => ({
        ...state,
        loadingWMS: false,
        loadedWMS: true,
        error: action.error.message
          ? action.error.message
          : action.error.toString(),
      }),
    );

    builder.addCase(preloadLayerDatesArraysForWMS.pending, state => ({
      ...state,
      loadingWMS: true,
    }));

    builder.addCase(
      preloadLayerDatesArraysForPointData.fulfilled,
      (
        state,
        { payload }: PayloadAction<Record<string, ReferenceDateTimestamp[]>>,
      ) => ({
        ...state,
        loadingPointData: false,
        loadedPointData: true,
        pointDataLayerDates: {
          ...state.pointDataLayerDates,
          ...payload,
        },
      }),
    );

    builder.addCase(
      preloadLayerDatesArraysForPointData.rejected,
      (state, action) => ({
        ...state,
        loadingPointData: false,
        loadedPointData: true,
        error: action.error.message
          ? action.error.message
          : action.error.toString(),
      }),
    );

    builder.addCase(preloadLayerDatesArraysForPointData.pending, state => ({
      ...state,
      loadingPointData: true,
    }));

    // Handle refetch action (same as fulfilled/pending/rejected but clears cache first)
    builder.addCase(
      refetchLayerDatesArraysForPointData.fulfilled,
      (
        state,
        { payload }: PayloadAction<Record<string, ReferenceDateTimestamp[]>>,
      ) => ({
        ...state,
        loadingPointData: false,
        loadedPointData: true,
        pointDataLayerDates: {
          ...state.pointDataLayerDates,
          ...payload,
        },
      }),
    );

    builder.addCase(
      refetchLayerDatesArraysForPointData.rejected,
      (state, action) => ({
        ...state,
        loadingPointData: false,
        loadedPointData: true,
        error: action.error.message
          ? action.error.message
          : action.error.toString(),
      }),
    );

    builder.addCase(refetchLayerDatesArraysForPointData.pending, state => ({
      ...state,
      loadingPointData: true,
    }));
  },
});

export const WMSLayerDatesRequested = (state: RootState): boolean =>
  state.serverPreloadState?.loadingWMS || state.serverPreloadState?.loadedWMS;

export const pointDataLayerDatesRequested = (state: RootState): boolean =>
  state.serverPreloadState?.loadingPointData ||
  state.serverPreloadState?.loadedPointData;

export const layerDatesPreloadedSelector = (state: RootState): boolean =>
  state.serverPreloadState?.loadedWMS &&
  state.serverPreloadState?.loadedPointData;

export const datesErrorSelector = (state: RootState): string | undefined =>
  state.serverPreloadState.error;

export default serverPreloadStateSlice.reducer;
