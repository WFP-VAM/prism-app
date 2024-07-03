import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LngLatBounds } from 'maplibre-gl';
import type { RootState } from './store';

type MapBoundaryInfoState = {
  bounds: LngLatBounds | null;
  zoom: number | null;
};

export const mapBoundaryInfoStateSlice = createSlice({
  name: 'mapBoundaryInfoState',
  initialState: {
    bounds: null,
    zoom: null,
  } as MapBoundaryInfoState,
  reducers: {
    setBounds: (state, { payload }: PayloadAction<LngLatBounds>) => ({
      ...state,
      bounds: payload,
    }),
    setLocation: (state, { payload }: PayloadAction<MapBoundaryInfoState>) =>
      payload,
  },
});

// Getters
export const boundsSelector = (
  state: RootState,
): MapBoundaryInfoState['bounds'] => state.mapBoundaryInfoState.bounds;

export const zoomSelector = (state: RootState): MapBoundaryInfoState['zoom'] =>
  state.mapBoundaryInfoState.zoom;

// Setters
export const { setBounds, setLocation } = mapBoundaryInfoStateSlice.actions;

export default mapBoundaryInfoStateSlice.reducer;
