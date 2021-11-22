import { createSlice, PayloadAction } from '@reduxjs/toolkit';
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
  // TODO default false
  isSelectionMode: true,
};

export const mapSelectionLayerStateSlice = createSlice({
  name: 'mapSelectionLayerState',
  initialState,
  reducers: {
    toggleSelectedBoundary: (
      { selectedBoundaries, ...rest },
      { payload }: PayloadAction<string>,
    ) => {
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
    removeSelectedBoundary: (state, action: PayloadAction<string>) => {
      return {
        ...state,
        selectedBoundaries: state.selectedBoundaries.filter(
          code => code !== action.payload,
        ),
      };
    },
    clearSelectedBoundaries: state => {
      return { ...state, selectedBoundaries: [] };
    },
    setIsSelectionMode: (
      state,
      { payload: isSelectionMode }: PayloadAction<boolean>,
    ) => {
      const { isSelectionMode: prevIsSelectionMode, ...rest } = state;
      // Same mode do nothing
      if (isSelectionMode === prevIsSelectionMode) {
        return state;
      }
      // If selection mode is turned off, clear selected boundaries
      if (!isSelectionMode) {
        return {
          ...rest,
          isSelectionMode,
          selectedBoundaries: [],
        };
      }
      return {
        ...rest,
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
} = mapSelectionLayerStateSlice.actions;

export default mapSelectionLayerStateSlice.reducer;
