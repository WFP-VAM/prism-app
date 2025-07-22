import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { AvailableDates, UserAuth } from 'config/types';
import { getAvailableDatesForLayer } from 'utils/server-utils';
import type { CreateAsyncThunkTypes, RootState } from './store';

type ServerState = {
  availableDates: AvailableDates;
  loading: boolean;
  error?: string;
  userAuth?: UserAuth;
};

const initialState: ServerState = {
  availableDates: {},
  loading: false,
};

export const loadAvailableDatesForLayer = createAsyncThunk<
  AvailableDates,
  string,
  CreateAsyncThunkTypes
>('serverState/loadAvailableDatesForLayer', (layerId: string, { getState }) =>
  getAvailableDatesForLayer(getState, layerId),
);

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
    setUserAuthGlobal: (
      state,
      { payload }: PayloadAction<ServerState['userAuth']>,
    ) => ({
      ...state,
      userAuth: payload,
    }),
    clearUserAuthGlobal: state => ({
      ...state,
      userAuth: undefined,
    }),
  },
  extraReducers: builder => {
    builder.addCase(
      loadAvailableDatesForLayer.fulfilled,
      (state, { payload }: PayloadAction<AvailableDates>) => ({
        ...state,
        loading: false,
        availableDates: {
          ...state.availableDates,
          ...payload,
        },
      }),
    );

    builder.addCase(loadAvailableDatesForLayer.rejected, (state, action) => ({
      ...state,
      loading: false,
      error: action.error.message
        ? action.error.message
        : action.error.toString(),
    }));

    builder.addCase(loadAvailableDatesForLayer.pending, state => ({
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

export const userAuthSelector = (state: RootState): UserAuth | undefined =>
  state.serverState.userAuth;

// Setters
export const {
  updateLayersCapabilities,
  setUserAuthGlobal,
  clearUserAuthGlobal,
} = serverStateSlice.actions;

export default serverStateSlice.reducer;
