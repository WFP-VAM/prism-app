import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LayerKey } from 'config/types';

import type { RootState } from './store';

type CogLayerLoadingState = {
  loadingLayerIds: LayerKey[];
};

export const cogLayerLoadingState = createSlice({
  name: 'cogLayerLoadingState',
  initialState: {
    loadingLayerIds: [],
  } as CogLayerLoadingState,
  reducers: {
    startLayerLoading: (state, { payload }: PayloadAction<LayerKey>) => {
      if (!state.loadingLayerIds.includes(payload)) {
        state.loadingLayerIds.push(payload);
      }
    },
    finishLayerLoading: (state, { payload }: PayloadAction<LayerKey>) => ({
      loadingLayerIds: state.loadingLayerIds.filter(id => id !== payload),
    }),
  },
});

export const { startLayerLoading, finishLayerLoading } =
  cogLayerLoadingState.actions;

export const cogLoadingLayerIdsSelector = (
  state: RootState,
): CogLayerLoadingState['loadingLayerIds'] =>
  state.cogLayerLoadingState.loadingLayerIds;

export default cogLayerLoadingState.reducer;
