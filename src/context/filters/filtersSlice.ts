import { Set } from 'immutable';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '../store';
import { LayerType } from '../../config/types';

interface Filters {
  layers: Set<LayerType>;
  currentDate: Date;
}

const initialState: Filters = {
  layers: Set<LayerType>(),
  currentDate: new Date(),
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

    updateDate: ({ layers, ...state }, { payload }: PayloadAction<Date>) => ({
      ...state,
      // 'layers' is getting converted into a object instead of Set<LayerType>
      layers: layers as Set<LayerType>,
      currentDate: payload,
    }),
  },
});

// Getters
export const selectLayers = (state: RootState) => state.filters.layers;
export const selectCurrentDate = (state: RootState) =>
  state.filters.currentDate;

// Setters
export const { addLayer, removeLayer, updateDate } = slice.actions;

export default slice.reducer;
