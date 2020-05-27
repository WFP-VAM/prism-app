import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from './store';
import { TableType } from '../config/types';

type TableState = {
  table: TableType;
  isShowing: boolean;
};

const initialState: TableState = {
  table: {} as TableType,
  isShowing: false,
};

export const tableStateSlice = createSlice({
  name: 'tableState',
  initialState,
  reducers: {
    setTable: (state, { payload }: PayloadAction<TableType>) => ({
      ...state,
      table: payload,
      isShowing: true,
    }),

    hideTable: state => ({ ...state, isShowing: false }),
  },
});

// TODO: memoize this to prevent repeat loading and parsing of CSV
export const getCurrTable = (state: RootState): TableType =>
  state.tableState.table;

// prevent trying to load and display table on start of app
export const getIsShowing = (state: RootState): boolean =>
  state.tableState.isShowing;

// export actions
export const { hideTable, setTable } = tableStateSlice.actions;

export default tableStateSlice.reducer;
