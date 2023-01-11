import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

type LeftPanelState = {
  tabValue: number;
};

const initialState: LeftPanelState = {
  tabValue: 0,
};

export const leftPanelSlice = createSlice({
  name: 'leftPanelState',
  initialState,
  reducers: {
    setTabValue: (state, { payload }: PayloadAction<number>) => ({
      ...state,
      tabValue: payload,
    }),
  },
});

// Getters
export const leftPanelTabValueSelector = (state: RootState): number =>
  state.leftPanelState.tabValue;

// Setters
export const { setTabValue } = leftPanelSlice.actions;

export default leftPanelSlice.reducer;
