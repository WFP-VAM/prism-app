import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from './store';
import { AvailableDates } from '../config/types';

type ServerState = {
  availableDates: AvailableDates;
};

const initialState: ServerState = {
  availableDates: {},
};

export const serverStateSlice = createSlice({
  name: 'serverState',
  initialState,
  reducers: {
    updateLayersCapabilities: (
      state,
      { payload }: PayloadAction<AvailableDates>,
    ) => ({
      ...state,
      availableDates: payload,
    }),
  },
});

// Getters
export const availableDatesSelector = (
  state: RootState,
): ServerState['availableDates'] => state.serverState.availableDates;

// Setters
export const { updateLayersCapabilities } = serverStateSlice.actions;

export default serverStateSlice.reducer;
