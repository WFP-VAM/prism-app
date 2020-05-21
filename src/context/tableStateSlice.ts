import { Map } from 'immutable';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from './store';
import { TableType } from '../config/types';

interface TableState extends Map<string, any> {}

const initialState: TableState = Map({
  table: {} as TableType,
  isShowing: false,
});

export const tableStateSlice = createSlice({
  name: 'tableState',
  initialState,
  reducers: {
    setTable: (state, { payload }: PayloadAction<TableType>) =>
      state.set('table', payload).set('isShowing', true),
    hideTable: state => state.set('isShowing', false),
  },
});

// TODO: memoize this to prevent repeat loading and parsing of CSV
export const getCurrTable = (state: RootState): TableType => {
  return state.tableState.get('table') as TableType;
};

// prevent trying to load and display table on start of app
export const getIsShowing = (state: RootState): boolean => {
  return state.tableState.get('isShowing');
};

// export actions
export const { hideTable, setTable } = tableStateSlice.actions;

export default tableStateSlice.reducer;
