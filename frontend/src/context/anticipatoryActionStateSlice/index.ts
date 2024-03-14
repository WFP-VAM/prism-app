import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import Papa from 'papaparse';
import { DateItem, DatesPropagation, Validity } from 'config/types';
import { generateIntermediateDateItemFromValidity } from 'utils/server-utils';
import { appConfig } from 'config';
import { AAWindowKeyToLayerId, AAWindowKeys } from 'config/utils';
import { AADataSeverityOrder } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/utils';
import type { CreateAsyncThunkTypes, RootState } from '../store';
import {
  AACategoryType,
  AnticipatoryActionData,
  AnticipatoryActionDataRow,
  allWindowsKey,
} from './types';

const AACSVKeys: [string, keyof AnticipatoryActionDataRow][] = [
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

const sortFn = (a: AnticipatoryActionDataRow, b: AnticipatoryActionDataRow) => {
  const aDate = new Date(a.date).valueOf();
  const bDate = new Date(b.date).valueOf();
  if (aDate > bDate) {
    return -1;
  }
  if (bDate > aDate) {
    return 1;
  }
  const aSev = AADataSeverityOrder(a.category, a.phase);
  const bSev = AADataSeverityOrder(b.category, b.phase);
  if (aSev > bSev) {
    return -1;
  }
  if (bSev > aSev) {
    return 1;
  }
  return 0;
};

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
    }) as AnticipatoryActionDataRow[];

  const validity: Validity = {
    mode: DatesPropagation.DEKAD,
    forward: 3,
  };

  const monitoredDistricts = [...new Set(parsed.map(x => x.district))];
  const emptyDistricts = Object.fromEntries(
    monitoredDistricts.map(x => [x, [] as AnticipatoryActionDataRow[]]),
  );

  const windowData = AAWindowKeys.map(windowKey => {
    const filtered = parsed.filter(x => x.windows === windowKey);

    // eslint-disable-next-line fp/no-mutating-methods
    const dates = [
      ...new Set(filtered.map(x => new Date(x.date).getTime())),
    ].sort();
    const availableDates = generateIntermediateDateItemFromValidity(
      dates,
      validity,
    );

    const groupedByDistrict = new Map<string, AnticipatoryActionDataRow[]>();
    filtered.forEach(x => {
      const { district } = x;
      const rows = groupedByDistrict.get(district);
      groupedByDistrict.set(district, rows ? [...rows, x] : [x]);
    });

    const result = Object.fromEntries(
      Array.from(groupedByDistrict.entries()).map(x => [
        x[0],
        // eslint-disable-next-line fp/no-mutating-methods
        x[1].sort(sortFn),
      ]),
    );

    return {
      data: { ...emptyDistricts, ...result },
      availableDates,
      windowKey,
    };
  });

  return { windowData, monitoredDistricts };
}

type AnticipatoryActionState = {
  data: { [windowKey: string]: AnticipatoryActionData | undefined };
  availableDates?: { [windowKey: string]: DateItem[] };
  monitoredDistricts: string[];
  selectedDateData: {
    [key: string]: Pick<
      AnticipatoryActionDataRow,
      'district' | 'windows' | 'category' | 'phase'
    >[];
  };
  selectedWindow: typeof AAWindowKeys[number] | typeof allWindowsKey;
  categoryFilters: Record<AACategoryType, boolean>;
  loading: boolean;
  error: string | null;
};

const initialState: AnticipatoryActionState = {
  data: {},
  availableDates: undefined,
  monitoredDistricts: [],
  selectedDateData: {},
  selectedWindow: allWindowsKey,
  categoryFilters: {
    Severo: true,
    Moderado: true,
    Leve: true,
    na: false,
    ny: false,
  },
  loading: false,
  error: null,
};

export const loadAAData = createAsyncThunk<
  {
    windowData: {
      data: AnticipatoryActionData;
      availableDates: DateItem[];
      windowKey: typeof AAWindowKeys[number];
    }[];
    monitoredDistricts: string[];
  },
  undefined,
  CreateAsyncThunkTypes
>('anticipatoryActionState/loadAAData', async () => {
  const url = appConfig.anticipatoryActionUrl;

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
  reducers: {
    setSelectedWindow: (
      state,
      { payload }: PayloadAction<AnticipatoryActionState['selectedWindow']>,
    ) => ({
      ...state,
      selectedWindow: payload,
    }),
    setCategoryFilters: (
      state,
      {
        payload,
      }: PayloadAction<
        Partial<Record<'Leve' | 'Moderado' | 'Severo', boolean>>
      >,
    ) => ({
      ...state,
      categoryFilters: { ...state.categoryFilters, ...payload },
    }),
    setSelectedDateData: (
      state,
      { payload }: PayloadAction<AnticipatoryActionState['selectedDateData']>,
    ) => ({
      ...state,
      selectedDateData: payload,
    }),
  },
  extraReducers: builder => {
    builder.addCase(loadAAData.fulfilled, (state, { payload }) => ({
      ...state,
      loading: false,
      data: Object.fromEntries(
        payload.windowData.map(x => [x.windowKey, x.data]),
      ),
      availableDates: Object.fromEntries(
        payload.windowData.map(x => [
          AAWindowKeyToLayerId[x.windowKey],
          x.availableDates,
        ]),
      ),
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

export const AnticipatoryActionAvailableDatesSelector = (state: RootState) =>
  state.anticipatoryActionState.availableDates;

export const AASelectedWindowSelector = (state: RootState) =>
  state.anticipatoryActionState.selectedWindow;

export const AACategoryFiltersSelector = (state: RootState) =>
  state.anticipatoryActionState.categoryFilters;

export const AASelectedDateDateSelector = (state: RootState) =>
  state.anticipatoryActionState.selectedDateData;

// export actions
export const {
  setSelectedWindow,
  setCategoryFilters,
  setSelectedDateData,
} = anticipatoryActionStateSlice.actions;

export default anticipatoryActionStateSlice.reducer;
