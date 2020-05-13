import { Map } from 'immutable';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from './store';
import { TableType } from '../config/types';

interface TableState extends Map<string, any> {}

const initialState: TableState = Map({
  table: {} as TableType,
});

export const tableStateSlice = createSlice({
  name: 'tableState',
  initialState,
  reducers: {
    setTable: (state, { payload }: PayloadAction<TableType>) => {
      state.set('table', payload);
      console.log({ state });
    },
  },
});

export const getCurrTable = (state: RootState): TableType =>
  state.tableState.get('table') as TableType;

// export actions
export const { setTable } = tableStateSlice.actions;

export default tableStateSlice.reducer;
