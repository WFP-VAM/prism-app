import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { appConfig } from 'config';
import type { RootState } from './store';

export interface DashboardState {
  title: string;
  textContent: string;
}

const initialState: DashboardState = {
  title: appConfig.configuredReports[0]?.title || 'Dashboard',
  textContent: '',
};

export const dashboardStateSlice = createSlice({
  name: 'dashboardState',
  initialState,
  reducers: {
    setTitle: (state, action: PayloadAction<string>) => ({
      ...state,
      title: action.payload,
    }),
    setTextContent: (state, action: PayloadAction<string>) => ({
      ...state,
      textContent: action.payload,
    }),
  },
});

// Getters
export const dashboardTitleSelector = (state: RootState): string =>
  state.dashboardState.title;

export const dashboardTextContentSelector = (state: RootState): string =>
  state.dashboardState.textContent;

// Setters
export const { setTitle, setTextContent } = dashboardStateSlice.actions;

export default dashboardStateSlice.reducer;
