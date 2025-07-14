import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { appConfig } from 'config';
import { LeftPanelState, Panel, PanelSize } from 'config/types';
import type { RootState } from './store';

const { hidePanel } = appConfig;

const initialState: LeftPanelState = {
  tabValue: hidePanel ? Panel.None : Panel.Layers,
  panelSize: PanelSize.medium,
};

export const leftPanelSlice = createSlice({
  name: 'leftPanelState',
  initialState,
  reducers: {
    setTabValue: (state, { payload }: PayloadAction<Panel>) => {
      if (payload === state.tabValue) {
        return {
          ...state,
          tabValue: Panel.None,
        };
      }
      return {
        ...state,
        tabValue: payload,
      };
    },
  },
});

// Getters
export const leftPanelTabValueSelector = (state: RootState): Panel =>
  state.leftPanelState.tabValue;

// Setters
export const { setTabValue } = leftPanelSlice.actions;

export default leftPanelSlice.reducer;
