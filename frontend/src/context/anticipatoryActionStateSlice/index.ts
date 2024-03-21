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
  AAPhaseType,
  AnticipatoryActionData,
  AnticipatoryActionDataRow,
  allWindowsKey,
} from './types';

const AACSVKeys: string[] = [
  'district',
  'index',
  'category',
  'window',
  'season',
  'type',
  'date_ready',
  'date_set',
  'issue_ready',
  'issue_set',
  'prob_ready',
  'prob_set',
  'trigger_ready',
  'trigger_set',
  'state',
  'new_tag',
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

function transform(data: any[]) {
  const nonEmpty = data.filter(x => !!x[AACSVKeys[0]]); // filter empty rows
  const parsed = nonEmpty
    .map(x => {
      const common = {
        category: x.category,
        district: x.district,
        index: x.index,
        type: x.type,
        window: x.window,
        new: Boolean(Number(x.new_tag)),
      };

      const ready = {
        phase: 'Ready',
        probability: Number(x.prob_ready),
        trigger: Number(x.trigger_ready),
        date: x.date_ready,
      };

      const set = {
        phase: 'Set',
        probability: Number(x.prob_set),
        trigger: Number(x.trigger_set),
        date: x.date_set,
      };

      return [
        { ...common, ...ready },
        { ...common, ...set },
      ];
    })
    .flat() as AnticipatoryActionDataRow[];

  const validity: Validity = {
    mode: DatesPropagation.DEKAD,
    forward: 3,
  };

  const monitoredDistricts = [...new Set(parsed.map(x => x.district))];
  const emptyDistricts = Object.fromEntries(
    monitoredDistricts.map(x => [x, [] as AnticipatoryActionDataRow[]]),
  );

  const windowData = AAWindowKeys.map(windowKey => {
    const filtered = parsed.filter(x => x.window === windowKey);

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
      'district' | 'window' | 'category' | 'phase'
    >[];
  };
  selectedWindow: typeof AAWindowKeys[number] | typeof allWindowsKey;
  categoryFilters: Record<AACategoryType, boolean>;
  renderedDistricts: Record<
    typeof AAWindowKeys[number],
    {
      [district: string]: { category: AACategoryType; phase: AAPhaseType };
    }
  >;
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
    Severe: true,
    Moderate: true,
    Mild: true,
    na: true,
    ny: true,
  },
  renderedDistricts: { 'Window 1': {}, 'Window 2': {} },
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
      complete: results => resolve(transform(results.data)),
      error: error => reject(error),
    }),
  );
});

interface CalculateMapRenderedDistrictsParams {
  selectedDateData: AnticipatoryActionState['selectedDateData'];
  categoryFilters: AnticipatoryActionState['categoryFilters'];
  selectedWindow: AnticipatoryActionState['selectedWindow'];
}

function calculateMapRenderedDistricts({
  selectedDateData,
  categoryFilters,
  selectedWindow,
}: CalculateMapRenderedDistrictsParams) {
  if (Object.entries(selectedDateData).length === 0) {
    return { 'Window 1': {}, 'Window 2': {} };
  }
  const mapped = Object.entries(selectedDateData).map<
    Pick<
      AnticipatoryActionDataRow,
      'district' | 'window' | 'category' | 'phase'
    >
  >(([district, districtData]) => {
    // eslint-disable-next-line fp/no-mutating-methods
    const sortedData = [...districtData].sort((a, b) => {
      const aOrder = AADataSeverityOrder(a.category, a.phase);
      const bOrder = AADataSeverityOrder(b.category, b.phase);

      if (aOrder > bOrder) {
        return -1;
      }
      if (aOrder < bOrder) {
        return 1;
      }
      return 0;
    });

    const filtered = sortedData.filter(x => categoryFilters[x.category]);

    // let the first window layer to render empty district
    if (filtered.length === 0) {
      return { district, category: 'ny', phase: 'ny', window: 'Window 1' };
    }

    if (selectedWindow === 'All') {
      const first = filtered[0];
      return {
        district,
        category: first.category,
        phase: first.phase,
        window: first.window,
      };
    }

    const windowFirst = filtered.find(x => x.window === selectedWindow);
    if (windowFirst) {
      return {
        district,
        category: windowFirst.category,
        phase: windowFirst.phase,
        window: selectedWindow,
      };
    }

    return { district, category: 'ny', phase: 'ny', window: selectedWindow };
  });

  const windowMap = new Map<
    typeof AAWindowKeys[number],
    Pick<AnticipatoryActionDataRow, 'district' | 'category' | 'phase'>[]
  >();
  windowMap.set('Window 1', []);
  windowMap.set('Window 2', []);
  mapped.forEach(({ window: win, ...rest }) => {
    const val = windowMap.get(win);
    windowMap.set(win, val ? [...val, rest] : [rest]);
  });

  return Object.fromEntries(
    Array.from(windowMap.entries()).map(([win, rows]) => {
      return [
        win,
        Object.fromEntries(
          rows.map(({ district, ...rest }) => [district, rest]),
        ),
      ];
    }),
  );
}

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
      renderedDistricts: calculateMapRenderedDistricts({
        selectedDateData: state.selectedDateData,
        categoryFilters: state.categoryFilters,
        selectedWindow: payload,
      }) as any,
    }),
    setCategoryFilters: (
      state,
      {
        payload,
      }: PayloadAction<
        Partial<Record<'Mild' | 'Moderate' | 'Severe', boolean>>
      >,
    ) => ({
      ...state,
      categoryFilters: { ...state.categoryFilters, ...payload },
      renderedDistricts: calculateMapRenderedDistricts({
        selectedDateData: state.selectedDateData,
        categoryFilters: { ...state.categoryFilters, ...payload },
        selectedWindow: state.selectedWindow,
      }) as any,
    }),
    setSelectedDateData: (
      state,
      { payload }: PayloadAction<AnticipatoryActionState['selectedDateData']>,
    ) => ({
      ...state,
      selectedDateData: payload,
      renderedDistricts: calculateMapRenderedDistricts({
        selectedDateData: payload,
        categoryFilters: state.categoryFilters,
        selectedWindow: state.selectedWindow,
      }) as any,
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

export const AARenderedDistrictsSelector = (state: RootState) =>
  state.anticipatoryActionState.renderedDistricts;

// export actions
export const {
  setSelectedWindow,
  setCategoryFilters,
  setSelectedDateData,
} = anticipatoryActionStateSlice.actions;

export default anticipatoryActionStateSlice.reducer;
