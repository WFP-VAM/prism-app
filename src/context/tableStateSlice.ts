import { Map } from 'immutable';
import Papa from 'papaparse';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from './store';
import { TableType } from '../config/types';

interface TableState extends Map<string, any> {}

const initialState: TableState = Map({
  table: {} as TableType,
  tableJson: [] as any[],
  isShowing: false,
});

// parse the csv, but only when we get a new table to parse
function setTableState(state: any, table: TableType) {
  Papa.parse(process.env.PUBLIC_URL + table.table, {
    header: true,
    download: true,
    complete: results => {
      console.log(results.data);
      state
        .set('table', table)
        .set('isShowing', true)
        .set('tableJson', results.data);
    },
  });
}

export const tableStateSlice = createSlice({
  name: 'tableState',
  initialState,
  reducers: {
    setTable: (state, { payload }: PayloadAction<TableType>) =>
      setTableState(state, payload),
    hideTable: state => state.set('isShowing', false),
  },
});

// TODO: memoize this to prevent repeat loading and parsing of CSV
export const getCurrTable = (state: RootState): TableType => {
  return state.tableState.get('table') as TableType;
};

export const getCurrTableJson = (state: RootState): any[] => {
  return state.tableState.get('tableJson') as any[];
};

// prevent trying to load and display table on start of app
export const getIsShowing = (state: RootState): boolean => {
  return state.tableState.get('isShowing');
};

// export actions
export const { hideTable, setTable } = tableStateSlice.actions;

export default tableStateSlice.reducer;
