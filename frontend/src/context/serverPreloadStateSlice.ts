import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { UserAuth } from 'config/types';
import {
  preloadLayerDatesForPointData,
  preloadLayerDatesForWMS,
} from 'utils/server-utils';
import type { CreateAsyncThunkTypes, RootState } from './store';

type ServerPreloadState = {
  layerDates: Record<string, number[]>;
  loading: boolean;
  error?: string;
  userAuth?: UserAuth;
};

const initialState: ServerPreloadState = {
  layerDates: {},
  loading: false,
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
        loading: false,
        layerDates: {
          ...state.layerDates,
          ...payload,
        },
      }),
    );

    builder.addCase(
      preloadLayerDatesArraysForWMS.rejected,
      (state, action) => ({
        ...state,
        loading: false,
        error: action.error.message
          ? action.error.message
          : action.error.toString(),
      }),
    );

    builder.addCase(preloadLayerDatesArraysForWMS.pending, state => ({
      ...state,
      loading: true,
    }));

    builder.addCase(
      preloadLayerDatesArraysForPointData.fulfilled,
      (state, { payload }: PayloadAction<Record<string, number[]>>) => ({
        ...state,
        loading: false,
        layerDates: {
          ...state.layerDates,
          ...payload,
        },
      }),
    );

    builder.addCase(
      preloadLayerDatesArraysForPointData.rejected,
      (state, action) => ({
        ...state,
        loading: false,
        error: action.error.message
          ? action.error.message
          : action.error.toString(),
      }),
    );

    builder.addCase(preloadLayerDatesArraysForPointData.pending, state => ({
      ...state,
      loading: true,
    }));
  },
});

export const preloadedLayerDatesSelector = (
  state: RootState,
): ServerPreloadState['layerDates'] => state.serverPreloadState.layerDates;

function isEmpty(object: any) {
  return Object.keys(object).length === 0;
}

export const layerDatesRequested = (state: RootState): boolean =>
  state.serverPreloadState.loading ||
  !isEmpty(state.serverPreloadState.layerDates);

export const datesErrorSelector = (state: RootState): string | undefined =>
  state.serverPreloadState.error;

export default serverPreloadStateSlice.reducer;
