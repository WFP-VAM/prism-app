import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { appConfig } from 'config';
import type { ConfiguredReport } from 'config/types';
import { DashboardElementType } from 'config/types';
import type { RootState } from './store';

export interface DashboardState {
  title: string;
  flexElements: ConfiguredReport['flexElements'];
}

const initialState: DashboardState = {
  title: appConfig.configuredReports[0]?.title || 'Dashboard',
  flexElements: appConfig.configuredReports[0]?.flexElements || [],
};

export const dashboardStateSlice = createSlice({
  name: 'dashboardState',
  initialState,
  reducers: {
    setTitle: (state, action: PayloadAction<string>) => ({
      ...state,
      title: action.payload,
    }),
    setTextContent: (
      state,
      action: PayloadAction<{ index: number; content: string }>,
    ) => {
      const { index, content } = action.payload;
      return {
        ...state,
        flexElements: state.flexElements.map((element, i) =>
          i === index ? { type: DashboardElementType.TEXT, content } : element,
        ),
      };
    },
  },
});

// Getters
export const dashboardTitleSelector = (state: RootState): string =>
  state.dashboardState.title;

export const dashboardFlexElementsSelector = (
  state: RootState,
): ConfiguredReport['flexElements'] => state.dashboardState.flexElements;

// Setters
export const { setTitle, setTextContent } = dashboardStateSlice.actions;

export default dashboardStateSlice.reducer;
