import { Map, Set } from 'immutable';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from './store';
import { LayerType } from '../config/types';

interface LayersSet extends Set<LayerType> {}
interface MapState extends Map<string, LayersSet | Date> {}

const initialState: MapState = Map({
  layers: Set<LayerType>(),
  currentDate: new Date(),
});

export const mapStateSlice = createSlice({
  name: 'mapState',
  initialState,
  reducers: {
    addLayer: (state, { payload }: PayloadAction<LayerType>) =>
      state.update('layers', layers => (layers as LayersSet).add(payload)),

    removeLayer: (state, { payload }: PayloadAction<LayerType>) =>
      state.update('layers', layers => (layers as LayersSet).delete(payload)),

    updateDate: (state, { payload }: PayloadAction<Date>) =>
      state.set('currentDate', payload),
  },
});

// Getters
export const selectLayers = (state: RootState) =>
  state.mapState.get('layers') as LayersSet;
export const selectCurrentDate = (state: RootState) =>
  state.mapState.get('currentDate') as Date;

// Setters
export const { addLayer, removeLayer, updateDate } = mapStateSlice.actions;

export default mapStateSlice.reducer;
