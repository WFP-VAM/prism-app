import { Map, Set } from 'immutable';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from './store';
import { LayerType } from '../config/types';

interface LayersSet extends Set<LayerType> {}
interface DateRange {
  startDate?: number;
  endDate?: number;
}
interface MapState extends Map<string, any> {}

const initialState: MapState = Map({
  layers: Set<LayerType>(),
  dateRange: {},
});

export const mapStateSlice = createSlice({
  name: 'mapState',
  initialState,
  reducers: {
    addLayer: (state, { payload }: PayloadAction<LayerType>) =>
      state.update('layers', layers => (layers as LayersSet).add(payload)),

    removeLayer: (state, { payload }: PayloadAction<LayerType>) =>
      state.update('layers', layers => (layers as LayersSet).delete(payload)),

    updateDateRange: (state, { payload }: PayloadAction<DateRange>) =>
      state.set('dateRange', payload),
  },
});

// Getters
export const layersSelector = (state: RootState) =>
  state.mapState.get('layers') as LayersSet;
export const dateRangeSelector = (state: RootState) =>
  state.mapState.get('dateRange') as DateRange;

// Setters
export const { addLayer, removeLayer, updateDateRange } = mapStateSlice.actions;

export default mapStateSlice.reducer;
