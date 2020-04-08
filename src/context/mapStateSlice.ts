import { Map } from 'immutable';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from './store';
import { LayersMap, LayerType } from '../config/types';

interface DateRange {
  startDate?: number;
  endDate?: number;
}
interface MapState extends Map<string, any> {}

const initialState: MapState = Map({
  layers: Map() as LayersMap,
  dateRange: {} as DateRange,
});

export const mapStateSlice = createSlice({
  name: 'mapState',
  initialState,
  reducers: {
    addLayer: (state, { payload }: PayloadAction<LayerType>) =>
      state.update('layers', layers =>
        (layers as LayersMap).set(payload.id, payload),
      ),

    removeLayer: (state, { payload }: PayloadAction<LayerType>) =>
      state.update('layers', layers =>
        (layers as LayersMap).delete(payload.id),
      ),

    updateDateRange: (state, { payload }: PayloadAction<DateRange>) =>
      state.set('dateRange', payload),
  },
});

// Getters
export const layersSelector = (state: RootState) =>
  state.mapState.get('layers') as LayersMap;
export const dateRangeSelector = (state: RootState) =>
  state.mapState.get('dateRange') as DateRange;

// Setters
export const { addLayer, removeLayer, updateDateRange } = mapStateSlice.actions;

export default mapStateSlice.reducer;
