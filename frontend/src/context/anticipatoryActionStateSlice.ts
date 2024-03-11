import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import Papa from 'papaparse';
import { LayerDefinitions } from 'config/utils';
import { AnticipatoryActionLayerProps } from 'config/types';
import type { CreateAsyncThunkTypes, RootState } from './store';

// na/ny are not actually found in CSV, but defined not to cause confusion when calling the functions
export const AAcategory = ['na', 'ny', 'Leve', 'Moderado', 'Severo'] as const;
export type AACategoryType = typeof AAcategory[number];

export const AAPhase = ['na', 'ny', 'Ready', 'Set'] as const;
export type AAPhaseType = typeof AAPhase[number];

export interface AnticipatoryActionData {
  category: AACategoryType;
  district: string;
  index: string;
  month: string;
  phase: AAPhaseType;
  probability: string;
  trigger: string;
  triggerNB: string;
  triggerType: string;
  type: string;
  windows: string;
  yearOfIssue: string;
  date: string;
}

export const AAlayerKey = 'anticipatory_action';

const AACSVKeys: [string, string][] = [
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
  const parsed = data
    .filter(x => !!x[keys[0][0]]) // filter empty rows
    .map(obj => {
      const entries = keys.map(k => [k[1], obj[k[0]]]);
      const month = obj.Month.padStart(2, '0');
      const year = obj.Year_of_issue.split('-')[0];

      // TODO: update this once CSV date format is revised
      const actualYear = Number(month) < 5 ? String(Number(year) + 1) : year;
      const date = `${actualYear}-${month}-01`;
      return Object.fromEntries([...entries, ['date', date]]);
    }) as AnticipatoryActionData[];

  const windows = [...new Set(parsed.map(x => x.windows))];
  // eslint-disable-next-line fp/no-mutating-methods
  const availableDates = [
    ...new Set(parsed.map(x => new Date(x.date).getTime())),
  ].sort();

  const groupedByDistrict = new Map<string, AnticipatoryActionData[]>();

  parsed.forEach(x => {
    const { district } = x;
    const rows = groupedByDistrict.get(district);
    groupedByDistrict.set(district, rows ? [...rows, x] : [x]);
  });

  const sortFn = (a: AnticipatoryActionData, b: AnticipatoryActionData) => {
    const aDate = new Date(a.date).valueOf();
    const bDate = new Date(b.date).valueOf();
    if (aDate > bDate) {
      return -1;
    }
    if (bDate > aDate) {
      return 1;
    }
    const aCatIndex = AAcategory.findIndex(x => x === a.category);
    const bCatIndex = AAcategory.findIndex(x => x === b.category);
    if (aCatIndex > bCatIndex) {
      return -1;
    }
    if (bCatIndex > aCatIndex) {
      return 1;
    }
    return 0;
  };

  const result = Object.fromEntries(
    // eslint-disable-next-line fp/no-mutating-methods
    Array.from(groupedByDistrict.entries()).map(x => [x[0], x[1].sort(sortFn)]),
  );

  const monitoredDistricts = Object.keys(result);

  return { data: result, windows, availableDates, monitoredDistricts };
}

type AnticipatoryActionState = {
  data: {
    [k: string]: AnticipatoryActionData[];
  };
  availableDates?: number[];
  monitoredDistricts: string[];
  windows: string[];
  loading: boolean;
  error: string | null;
};

const initialState: AnticipatoryActionState = {
  data: {},
  windows: [],
  availableDates: undefined,
  monitoredDistricts: [],
  loading: false,
  error: null,
};

export const loadAAData = createAsyncThunk<
  {
    data: {
      [k: string]: AnticipatoryActionData[];
    };
    windows: string[];
    availableDates: number[];
    monitoredDistricts: string[];
  },
  undefined,
  CreateAsyncThunkTypes
>('anticipatoryActionState/loadAAData', async () => {
  const layer = LayerDefinitions[AAlayerKey] as AnticipatoryActionLayerProps;

  const url = layer.baseUrl;
  return new Promise<any>((resolve, reject) =>
    Papa.parse(url, {
      header: true,
      download: true,
      complete: results => resolve(transform(results.data, AACSVKeys)),
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
      data: payload.data,
      windows: payload.windows,
      availableDates: payload.availableDates,
      monitoredDistricts: payload.monitoredDistricts,
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

export const AnticipatoryActionWindowsSelector = (state: RootState) =>
  state.anticipatoryActionState.windows;

export const AnticipatoryActionAvailableDatesSelector = (state: RootState) =>
  state.anticipatoryActionState.availableDates;

// export actions
// export const {  } = tableStateSlice.actions;

export default anticipatoryActionStateSlice.reducer;
