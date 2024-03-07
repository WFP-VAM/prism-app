import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import Papa from 'papaparse';
import { LayerDefinitions } from 'config/utils';
import { AnticipatoryActionLayerProps } from 'config/types';
import type { CreateAsyncThunkTypes, RootState } from './store';

export const AAlayerKey = 'anticipatory_action';

const AACSVKyes: [string, string][] = [
  ['Category', 'category'],
  ['District', 'district'],
  ['Index', 'index'],
  ['Month', 'month'],
  ['Phase', 'phase'],
  ['Probability', 'probability'],
  ['Trigger', 'trigger'],
  ['Trigger_nb', 'triggerNB'],
  ['Trigger_type', 'triggerType'],
  ['Type', 'type'],
  ['Windows', 'windows'],
  ['Year_of_issue', 'yearOfIssue'],
];

function transform(data: any[], keys: [string, string][]) {
  return data
    .filter(x => !!x[keys[0][0]]) // filter empty rows
    .map(obj => {
      const entries = keys.map(k => [k[1], obj[k[0]]]);
      const month = obj.Month.padStart(2, '0');
      const year = obj.Year_of_issue.split('-')[0];
      const date = `${year}-${month}-01`;
      return Object.fromEntries([...entries, ['date', date]]);
    });
}

export interface AnticipatoryActionData {
  category: 'Leve' | 'Moderado' | 'Severo';
  district: string;
  index: string;
  month: string;
  phase: 'Ready' | 'Set';
  probability: string;
  trigger: string;
  triggerNB: string;
  triggerType: string;
  type: string;
  windows: string;
  yearOfIssue: string;
  date: string;
}

type AnticipatoryActionState = {
  data: AnticipatoryActionData[];
  loading: boolean;
  error: string | null;
};

const initialState: AnticipatoryActionState = {
  data: [],
  loading: false,
  error: null,
};

export const loadAAData = createAsyncThunk<
  { rows: AnticipatoryActionData[]; columns: string[] },
  undefined,
  CreateAsyncThunkTypes
>('anticipatoryActionState/loadAAData', async () => {
  const layer = LayerDefinitions[AAlayerKey] as AnticipatoryActionLayerProps;

  const url = layer.baseUrl;
  return new Promise<any>((resolve, reject) =>
    Papa.parse(url, {
      header: true,
      download: true,
      complete: results =>
        resolve({
          rows: transform(results.data, AACSVKyes),
          columns: Object.keys(results.data[0]),
        }),
      error: error => reject(error),
    }),
  );
});

export const anticipatoryActionStateSlice = createSlice({
  name: 'anticipatoryActionState',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(loadAAData.fulfilled, (state, { payload }) => ({
      ...state,
      loading: false,
      data: payload.rows,
    }));

    builder.addCase(loadAAData.rejected, (state, action) => ({
      ...state,
      loading: false,
      error: action.error.message
        ? action.error.message
        : action.error.toString(),
    }));

    builder.addCase(loadAAData.pending, ({ error, ...state }) => ({
      ...state,
      error: null,
      loading: true,
    }));
  },
});

// export selectors
export const AnticipatoryActionDataSelector = (state: RootState) =>
  state.anticipatoryActionState.data;

// export actions
// export const {  } = tableStateSlice.actions;

export default anticipatoryActionStateSlice.reducer;
