import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { appConfig } from 'config';
import type { RootState } from './store';

export interface DashboardState {
  title: string;
}

const initialState: DashboardState = {
  title: appConfig.configuredReports[0]?.title || 'Dashboard',
};

export const dashboardStateSlice = createSlice({
  name: 'dashboardState',
  initialState,
  reducers: {
    setTitle: (state, action: PayloadAction<string>) => ({
      ...state,
      title: action.payload,
    }),
  },
});

// Getters
export const dashboardTitleSelector = (state: RootState): string =>
  state.dashboardState.title;

// Setters
export const { setTitle } = dashboardStateSlice.actions;

export default dashboardStateSlice.reducer;
