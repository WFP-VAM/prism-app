import { Set } from 'immutable';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '../store';
import { LayerType } from '../../config/types';

interface LayersState {
  layers: Set<LayerType>;
}

const initialState: LayersState = {
  layers: Set<LayerType>(),
};

export const slice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    addLayer: (
      { layers, ...state },
      { payload }: PayloadAction<LayerType>,
    ) => ({
      ...state,
      layers: layers.add(payload),
    }),
    removeLayer: (
      { layers, ...state },
      { payload }: PayloadAction<LayerType>,
    ) => ({
      ...state,
      layers: layers.delete(payload),
    }),
  },
});

// Getters
export const selectlayers = (state: RootState) => state.filters.layers;

// Setters
export const { addLayer, removeLayer } = slice.actions;

export default slice.reducer;
