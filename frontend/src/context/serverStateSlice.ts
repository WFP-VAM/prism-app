import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { AvailableDates, UserAuth } from 'config/types';
import { getAvailableDatesForLayer } from 'utils/server-utils';
import type { CreateAsyncThunkTypes, RootState } from './store';

type ServerState = {
  availableDates: AvailableDates;
  // ids of layers that are being loaded to prevent firing multiple
  // load actions
  loadingLayerIds: string[]; // TODO: should this be LayerKey[] ?
  error?: string;
  userAuth?: UserAuth;
};

const initialState: ServerState = {
  availableDates: {},
  loadingLayerIds: [],
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
      (state, { meta, payload }) => ({
        ...state,
        loadingLayerIds: state.loadingLayerIds.filter(id => id !== meta.arg),
        availableDates: {
          ...state.availableDates,
          ...payload,
        },
      }),
    );

    builder.addCase(loadAvailableDatesForLayer.rejected, (state, action) => ({
      ...state,
      loadingLayerIds: state.loadingLayerIds.filter(
        id => id !== action.meta.arg,
      ),
      error: action.error.message
        ? action.error.message
        : action.error.toString(),
    }));

    builder.addCase(loadAvailableDatesForLayer.pending, (state, action) => ({
      ...state,
      loadingLayerIds: state.loadingLayerIds.concat([action.meta.arg]),
    }));
  },
});

// Getters
export const availableDatesSelector = (
  state: RootState,
): ServerState['availableDates'] => state.serverState.availableDates;

export const isLoading = (state: RootState): boolean =>
  state.serverState.loadingLayerIds.length > 0;

export const layersLoading = (
  state: RootState,
): ServerState['loadingLayerIds'] => state.serverState.loadingLayerIds;

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
