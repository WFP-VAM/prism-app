import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import * as Papa from 'papaparse';
import { FeatureCollection } from 'geojson';
import type { LayerDataParams, LazyLoader } from './layer-data';
import { BoundaryLayerProps } from '../../config/types';
import type { CreateAsyncThunkTypes, RootState } from '../store';
import { TableData } from '../tableStateSlice';

export interface BoundaryLayerData extends FeatureCollection {}

export const fetchBoundaryLayerData: LazyLoader<BoundaryLayerProps> = () => async (
  params: LayerDataParams<BoundaryLayerProps>,
) => {
  const { layer } = params;
  const { path } = layer;

  return (await fetch(path)).json();
};

type DatasetState = {
  data?: TableData;
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
  reducers: {},
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

export default datasetResultStateSlice.reducer;
