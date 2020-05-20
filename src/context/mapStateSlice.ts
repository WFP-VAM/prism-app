import { Map } from 'immutable';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Map as MapBoxMap } from 'mapbox-gl';
import { RootState } from './store';
import { LayersMap, LayerType } from '../config/types';

interface DateRange {
  startDate?: number;
  endDate?: number;
}
interface MapState extends Map<string, any> {}

// MapboxGL's map type contains some kind of cyclic dependency that causes an infinite loop in Redux's change
// tracking. To save it off, we wrap it in a JS closure so that Redux just checks the function for changes, rather
// than recursively walking the whole object.
type MapGetter = () => MapBoxMap | undefined;

const initialState: MapState = Map({
  layers: Map() as LayersMap,
  dateRange: {} as DateRange,
  mapboxMap: () => {},
});

export const mapStateSlice = createSlice({
  name: 'mapState',
  initialState,
  reducers: {
    addLayer: (state, { payload }: PayloadAction<LayerType>) =>
      state.setIn(['layers', payload.id], payload),

    removeLayer: (state, { payload }: PayloadAction<LayerType>) =>
      state.deleteIn(['layers', payload.id]),

    updateDateRange: (state, { payload }: PayloadAction<DateRange>) =>
      state.set('dateRange', payload),

    setMap: (state, { payload }: PayloadAction<MapGetter>) => {
      return state.set('mapboxMap', payload);
    },
  },
});

// Getters
export const layersSelector = (state: RootState) =>
  state.mapState.get('layers') as LayersMap;
export const dateRangeSelector = (state: RootState) =>
  state.mapState.get('dateRange') as DateRange;
export const mapSelector = (state: RootState) =>
  state.mapState.get('mapboxMap') as MapGetter;

// Setters
export const {
  addLayer,
  removeLayer,
  updateDateRange,
  setMap,
} = mapStateSlice.actions;

export default mapStateSlice.reducer;
