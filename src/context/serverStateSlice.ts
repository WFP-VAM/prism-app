import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { AvailableDates, KoboAuthParams } from '../config/types';
import { getLayersAvailableDates } from '../utils/server-utils';
import type { CreateAsyncThunkTypes, RootState } from './store';

type ServerState = {
  availableDates: AvailableDates;
  loading: boolean;
  error?: string;
  koboAuthParams?: KoboAuthParams;
};

const initialState: ServerState = {
  availableDates: {},
  loading: false,
};

export const loadAvailableDates = createAsyncThunk<
  AvailableDates,
  void,
  CreateAsyncThunkTypes
>('serverState/loadAvailableDates', () => getLayersAvailableDates());

export const serverStateSlice = createSlice({
  name: 'serverState',
  initialState,
  reducers: {
    updateLayersCapabilities: (
      state,
      { payload }: PayloadAction<AvailableDates>,
    ) => ({
      ...state,
      availableDates: payload,
    }),
    setLayerAccessToken: (
      state,
      { payload }: PayloadAction<KoboAuthParams>,
    ) => ({
      ...state,
      koboAuthParams: payload,
    }),
    clearKoboParams: state => ({
      ...state,
      koboAuthParams: undefined,
    }),
  },
  extraReducers: builder => {
    builder.addCase(
      loadAvailableDates.fulfilled,
      (state, { payload }: PayloadAction<AvailableDates>) => ({
        ...state,
        loading: false,
        availableDates: payload,
      }),
    );

    builder.addCase(loadAvailableDates.rejected, (state, action) => ({
      ...state,
      loading: false,
      error: action.error.message
        ? action.error.message
        : action.error.toString(),
    }));

    builder.addCase(loadAvailableDates.pending, state => ({
      ...state,
      loading: true,
    }));
  },
});

// Getters
export const availableDatesSelector = (
  state: RootState,
): ServerState['availableDates'] => state.serverState.availableDates;

export const isLoading = (state: RootState): ServerState['loading'] =>
  state.serverState.loading;

export const datesErrorSelector = (state: RootState): string | undefined =>
  state.serverState.error;

export const koboAuthParamsSelector = (
  state: RootState,
): KoboAuthParams | undefined => state.serverState.koboAuthParams;

// Setters
export const {
  updateLayersCapabilities,
  setLayerAccessToken,
  clearKoboParams,
} = serverStateSlice.actions;

export default serverStateSlice.reducer;
