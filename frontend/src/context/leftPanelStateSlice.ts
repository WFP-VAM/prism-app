import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

export enum Panel {
  Layers = 'layers',
  Charts = 'charts',
  Analysis = 'analysis',
  Tables = 'tables',
}

type LeftPanelState = {
  tabValue: Panel;
};

const initialState: LeftPanelState = {
  tabValue: Panel.Layers,
};

export const leftPanelSlice = createSlice({
  name: 'leftPanelState',
  initialState,
  reducers: {
    setTabValue: (state, { payload }: PayloadAction<Panel>) => ({
      ...state,
      tabValue: payload,
    }),
  },
});

// Getters
export const leftPanelTabValueSelector = (state: RootState): Panel =>
  state.leftPanelState.tabValue;

// Setters
export const { setTabValue } = leftPanelSlice.actions;

export default leftPanelSlice.reducer;
