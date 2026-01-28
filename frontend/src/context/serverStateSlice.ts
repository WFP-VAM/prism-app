import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { AvailableDates, UserAuth } from 'config/types';
import { getAvailableDatesForLayer, getLayerType } from 'utils/server-utils';
import { LayerDefinitions } from '../config/utils';
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
>(
  'serverState/loadAvailableDatesForLayer',
  async (layerId: string, { getState }) =>
    getAvailableDatesForLayer(getState, layerId),
  {
    condition: (layerId: string, { getState }) => {
      const alreadyLoading = layersLoadingDatesIdsSelector(getState());
      // for layer types that depend on preloaded data, make sure that data is
      // ready before we try calculating available dates. The condition can return
      // a promise, in which case the action above will only be dispatched once
      // that promise has resolved. This effectively allows waiting for the data
      // preloading to complete, which can happen in e2e tests where a layer
      // is activated very early on, or for slow networks.
      if (getLayerType(LayerDefinitions[layerId]) === 'WMSLayer') {
        // action already dispatched, don't do it twice
        if (alreadyLoading.includes(layerId)) {
          return false;
        }
        // data preloaded, dispatch the new action
        if (
          !alreadyLoading.includes(layerId) &&
          getState().serverPreloadState.loadedWMS
        ) {
          return true;
        }
        // data preloading not completed, wait for it
        return new Promise(resolve => {
          const check = () => {
            if (getState().serverPreloadState.loadedWMS) {
              resolve(true);
            } else {
              // poll the state :/
              setTimeout(check, 100);
            }
          };
          check();
        });
      }
      if (getLayerType(LayerDefinitions[layerId]) === 'pointDataLayer') {
        if (alreadyLoading.includes(layerId)) {
          return false;
        }
        if (
          !alreadyLoading.includes(layerId) &&
          getState().serverPreloadState.loadedPointData
        ) {
          return true;
        }
        return new Promise(resolve => {
          const check = () => {
            if (getState().serverPreloadState.loadedPointData) {
              resolve(true);
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        });
      }
      // other layers are simpler, just check if it's already loading
      return !alreadyLoading.includes(layerId);
    },
  },
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

export const layersLoadingDatesIdsSelector = (
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
