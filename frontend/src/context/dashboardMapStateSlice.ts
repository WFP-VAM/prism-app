import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Map as MaplibreMap, LngLatBounds } from 'maplibre-gl';

// Maplibre's map type contains some kind of cyclic dependency that causes an infinite loop in immers's change
// tracking. To save it off, we wrap it in a JS closure so that Redux just checks the function for changes, rather
// than recursively walking the whole object.
type MapGetter = () => MaplibreMap | undefined;

export interface DashboardMapState {
  maplibreMap: MapGetter;
  layers: any[];
  bounds: LngLatBounds | null;
  zoom: number | null;
}

const initialState: DashboardMapState = {
  maplibreMap: (() => {}) as MapGetter,
  layers: [],
  bounds: null,
  zoom: null,
};

export const dashboardMapStateSlice = createSlice({
  name: 'dashboardMapState',
  initialState,
  reducers: {
    setDashboardMap: (state, action: PayloadAction<MapGetter>) => ({
      ...state,
      maplibreMap: action.payload,
    }),
    addDashboardLayer: (state, action: PayloadAction<any>) => ({
      ...state,
      layers: [...state.layers, action.payload],
    }),
    removeDashboardLayer: (state, action: PayloadAction<string>) => ({
      ...state,
      layers: state.layers.filter(layer => layer.id !== action.payload),
    }),
    setDashboardLayers: (state, action: PayloadAction<any[]>) => ({
      ...state,
      layers: action.payload,
    }),
    setDashboardBounds: (state, action: PayloadAction<LngLatBounds>) => ({
      ...state,
      bounds: action.payload,
    }),
    setDashboardLocation: (
      state,
      action: PayloadAction<{ bounds: LngLatBounds; zoom: number }>,
    ) => ({
      ...state,
      bounds: action.payload.bounds,
      zoom: action.payload.zoom,
    }),
  },
});

// Getters
export const dashboardMapSelector = (state: {
  dashboardMapState: DashboardMapState;
}): MaplibreMap | undefined => state.dashboardMapState.maplibreMap();

export const dashboardLayersSelector = (state: {
  dashboardMapState: DashboardMapState;
}): any[] => state.dashboardMapState.layers;

export const dashboardBoundsSelector = (state: {
  dashboardMapState: DashboardMapState;
}): LngLatBounds | null => state.dashboardMapState.bounds;

export const dashboardZoomSelector = (state: {
  dashboardMapState: DashboardMapState;
}): number | null => state.dashboardMapState.zoom;

// Setters
export const {
  setDashboardMap,
  addDashboardLayer,
  removeDashboardLayer,
  setDashboardLayers,
  setDashboardBounds,
  setDashboardLocation,
} = dashboardMapStateSlice.actions;

export default dashboardMapStateSlice.reducer;
