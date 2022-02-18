import moment from 'moment';
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import * as Papa from 'papaparse';
import type { CreateAsyncThunkTypes, RootState } from './store';
import { TableData } from './tableStateSlice';

type DatasetState = {
  data?: TableData;
  title?: string;
};

const initialState: DatasetState = {};

export type DatasetParams = {
  id: string;
  filepath: string;
};

export const loadDataset = createAsyncThunk<
  TableData,
  DatasetParams,
  CreateAsyncThunkTypes
>('datasetState/loadDataset', async (params: DatasetParams) => {
  const url = process.env.PUBLIC_URL + params.filepath;

  return new Promise<TableData>((resolve, reject) =>
    Papa.parse(url, {
      header: true,
      download: true,
      complete: results => {
        const row = results.data.find(item => item.Admin2_Code === params.id);

        return resolve({
          rows: [...results.data.slice(0, 1), row],
          columns: Object.keys(row),
        });
      },
      error: error => reject(error),
    }),
  );
});

export const datasetResultStateSlice = createSlice({
  name: 'DatasetResultSlice',
  initialState,
  reducers: {
    addEwsDataset: (
      { ...rest },
      { payload }: PayloadAction<TableData>,
    ): DatasetState => {
      const { rows, columns } = payload;
      const formattedRows = [
        Object.fromEntries(
          Object.keys(rows[0]).map(k => [
            k,
            k === 'level'
              ? rows[0][k]
              : moment(rows[0][k]).local().format('DD/mm/YYYY HH:MM'),
          ]),
        ),
        ...rows.slice(1, rows.length),
      ];

      return { ...rest, data: { rows: formattedRows, columns } };
    },
    addPointTitle: ({ ...rest }, { payload }: PayloadAction<string>) => {
      return { ...rest, title: payload };
    },
  },
  extraReducers: builder => {
    builder.addCase(
      loadDataset.fulfilled,
      ({ ...rest }, { payload }: PayloadAction<TableData>): DatasetState => ({
        ...rest,
        data: payload,
      }),
    );
  },
});

export const DatasetSelector = (state: RootState): TableData | undefined =>
  state.datasetState.data;
export const PointTitleSelector = (state: RootState): string | undefined =>
  state.datasetState.title;

// Setters
export const { addEwsDataset, addPointTitle } = datasetResultStateSlice.actions;

export default datasetResultStateSlice.reducer;
