import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { UserAuth } from 'config/types';
import {
  preloadLayerDatesForPointData,
  preloadLayerDatesForWMS,
} from 'utils/server-utils';
import type { CreateAsyncThunkTypes, RootState } from './store';

type ServerPreloadState = {
  WMSLayerDates: Record<string, number[]>;
  pointDataLayerDates: Record<string, number[]>;
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
  Record<string, number[]>,
  void,
  CreateAsyncThunkTypes
>('serverState/preloadLayerDatesForWMS', (_, { dispatch }) =>
  preloadLayerDatesForWMS(dispatch),
);

export const preloadLayerDatesArraysForPointData = createAsyncThunk<
  Record<string, number[]>,
  void,
  CreateAsyncThunkTypes
>('serverState/preloadLayerDatesForPointData', (_, { dispatch }) =>
  preloadLayerDatesForPointData(dispatch),
);

export const serverPreloadStateSlice = createSlice({
  name: 'serverPreloadState',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(
      preloadLayerDatesArraysForWMS.fulfilled,
      (state, { payload }: PayloadAction<Record<string, number[]>>) => ({
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
      (state, { payload }: PayloadAction<Record<string, number[]>>) => ({
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
  },
});

export const WMSLayerDatesRequested = (state: RootState): boolean =>
  state.serverPreloadState?.loadingWMS || state.serverPreloadState?.loadedWMS;

export const pointDataLayerDatesRequested = (state: RootState): boolean =>
  state.serverPreloadState?.loadingPointData ||
  state.serverPreloadState?.loadedPointData;

export const layerDatesPreloaded = (state: RootState): boolean =>
  state.serverPreloadState?.loadedWMS &&
  state.serverPreloadState?.loadedPointData;

export const datesErrorSelector = (state: RootState): string | undefined =>
  state.serverPreloadState.error;

export default serverPreloadStateSlice.reducer;
