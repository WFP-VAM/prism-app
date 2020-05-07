import { Map } from 'immutable';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from './store';
import { AvailableDates } from '../config/types';

interface ServerState extends Map<string, any> {}

const initialState: ServerState = Map({
  availableDates: Map(),
});

export const serverStateSlice = createSlice({
  name: 'serverState',
  initialState,
  reducers: {
    updateLayersCapabilities: (
      state,
      { payload }: PayloadAction<AvailableDates>,
    ) => state.set('availableDates', payload),
  },
});

// Getters
export const availableDatesSelector = (state: RootState) =>
  state.serverState.get('availableDates') as AvailableDates;

// Setters
export const { updateLayersCapabilities } = serverStateSlice.actions;

export default serverStateSlice.reducer;
