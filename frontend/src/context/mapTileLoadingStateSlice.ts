import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LayerKey } from '../config/types';
import type { RootState } from './store';

type MapTileLoadingState = {
  loadingLayerIds: LayerKey[];
};

export const mapTileLoadingState = createSlice({
  name: 'mapTileLoadingState',
  initialState: {
    loadingLayerIds: [],
  } as MapTileLoadingState,
  reducers: {
    setLoadingLayerIds: (state, { payload }: PayloadAction<LayerKey[]>) => {
      return {
        loadingLayerIds: payload,
      };
    },
  },
});

export const { setLoadingLayerIds } = mapTileLoadingState.actions;

export const loadingLayerIdsSelector = (
  state: RootState,
): MapTileLoadingState['loadingLayerIds'] =>
  state.mapTileLoadingState.loadingLayerIds;

export default mapTileLoadingState.reducer;
