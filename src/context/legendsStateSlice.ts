import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from './store';

export interface LegendsState {
  visible: boolean;
}

const initialState: LegendsState = {
  visible: true,
};

export const legendsStateSlice = createSlice({
  name: 'legendsState',
  initialState,
  reducers: {
    toggleVisible: state => ({
      ...state,
      visible: !state.visible,
    }),
  },
});

// Getters
export const legendsSelector = (state: RootState): LegendsState =>
  state.legendsState;
export const legendsVisibleSelector = (
  state: RootState,
): LegendsState['visible'] => state.legendsState.visible;

// Setters
export const { toggleVisible } = legendsStateSlice.actions;

export default legendsStateSlice.reducer;
