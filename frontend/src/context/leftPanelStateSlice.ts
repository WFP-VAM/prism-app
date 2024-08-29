import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { appConfig } from 'config';
import { PanelSize } from 'config/types';
import type { RootState } from './store';

const { hidePanel } = appConfig;

export enum Panel {
  None = 'none',
  Layers = 'layers',
  Charts = 'charts',
  Analysis = 'analysis',
  Tables = 'tables',
  AnticipatoryAction = 'anticipatory_action',
  Alerts = 'alerts',
}

type LeftPanelState = {
  tabValue: Panel;
  panelSize: PanelSize;
};

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
