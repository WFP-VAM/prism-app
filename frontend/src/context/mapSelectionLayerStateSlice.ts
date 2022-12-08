import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { uniq } from 'lodash';
import type { RootState } from './store';

// This is used by the selection layer to provide the ability to select layers with the mouse.

interface MapSelectionState {
  // Current cells which are selected on the map (holds their code from admin_boundaries.json)
  selectedBoundaries: string[];
  // If true, clicking the map selects a boundary. If set to false, selectedBoundaries is cleared and selection is disabled.
  isSelectionMode: boolean;
}

const initialState: MapSelectionState = {
  selectedBoundaries: [],
  isSelectionMode: false,
};

export const mapSelectionLayerStateSlice = createSlice({
  name: 'mapSelectionLayerState',
  initialState,
  reducers: {
    toggleSelectedBoundary: (state, { payload }: PayloadAction<string>) => {
      const { selectedBoundaries, ...rest } = state;
      if (!state.isSelectionMode) {
        return state;
      }
      if (selectedBoundaries.includes(payload)) {
        return {
          ...rest,
          selectedBoundaries: selectedBoundaries.filter(
            code => code !== payload,
          ),
        };
      }
      return {
        ...rest,
        selectedBoundaries: [...selectedBoundaries, payload],
      };
    },
    setSelectedBoundaries: (state, { payload }: PayloadAction<string[]>) => {
      return {
        ...state,
        selectedBoundaries: uniq(payload),
      };
    },
    clearSelectedBoundaries: state => {
      return { ...state, selectedBoundaries: [] };
    },
    setIsSelectionMode: (
      state,
      { payload: isSelectionMode }: PayloadAction<boolean>,
    ) => {
      return {
        ...state,
        isSelectionMode,
      };
    },
  },
});

// Getters
export const getSelectedBoundaries = (state: RootState) =>
  state.mapSelectionLayerStateSlice.selectedBoundaries;
export const getIsSelectionMode = (state: RootState) =>
  state.mapSelectionLayerStateSlice.isSelectionMode;

// Setters
export const {
  toggleSelectedBoundary,
  clearSelectedBoundaries,
  setIsSelectionMode,
  setSelectedBoundaries,
} = mapSelectionLayerStateSlice.actions;

export default mapSelectionLayerStateSlice.reducer;
