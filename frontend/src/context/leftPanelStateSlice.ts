import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { appConfig } from 'config';
import { LeftPanelState, Panel, PanelSize } from 'config/types';
import type { RootState } from './store';

const { hidePanel } = appConfig;

const initialState: LeftPanelState = {
  tabValue: hidePanel ? Panel.None : Panel.Layers,
  panelSize: PanelSize.medium,
};

// Panels with multiple options should not get “unset” when selecting the same child
const DROPDOWN_PANELS = [
  Panel.AnticipatoryActionDrought,
  Panel.AnticipatoryActionStorm,
  Panel.Dashboard,
];

export const leftPanelSlice = createSlice({
  name: 'leftPanelState',
  initialState,
  reducers: {
    setTabValue: (state, { payload }: PayloadAction<Panel>) => {
      if (
        payload === state.tabValue &&
        !DROPDOWN_PANELS.includes(state.tabValue)
      ) {
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
