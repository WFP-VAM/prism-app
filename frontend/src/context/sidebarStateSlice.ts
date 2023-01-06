import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

type SidebarState = {
  tabValue: number;
};

const initialState: SidebarState = {
  tabValue: 0,
};

export const sidebarSlice = createSlice({
  name: 'sidebarState',
  initialState,
  reducers: {
    setTabValue: (state, { payload }: PayloadAction<number>) => ({
      ...state,
      tabValue: payload,
    }),
  },
});

// Getters
export const sidebarTabValueSelector = (state: RootState): number =>
  state.sidebarState.tabValue;

// Setters
export const { setTabValue } = sidebarSlice.actions;

export default sidebarSlice.reducer;
