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
  AnticipatoryActionState,
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

  const groupedByWinDistIndexMap = new Map<
    string,
    AnticipatoryActionDataRow[]
  >();
  parsed.forEach(x => {
    const key = `${x.window}_${x.district}_${x.index}`;
    const val = groupedByWinDistIndexMap.get(key);
    groupedByWinDistIndexMap.set(key, val ? [...val, x] : [x]);
  });
  const extraRows = Array.from(groupedByWinDistIndexMap.values())
    .map(x => {
      // eslint-disable-next-line fp/no-mutating-methods
      const sorted = x.sort((a, b) => -sortFn(a, b));
      let isSetSev: boolean = false;
      let isSetMod: boolean = false;
      let isSetMil: boolean = false;
      return sorted.reduce((acc, curr) => {
        const prev = acc.length > 0 ? acc[acc.length - 1] : undefined;
        if (curr.probability > curr.trigger && curr.phase === 'Set') {
          if (curr.category === 'Severe') {
            // eslint-disable-next-line fp/no-mutation
            isSetSev = true;
          } else if (curr.category === 'Moderate') {
            // eslint-disable-next-line fp/no-mutation
            isSetMod = true;
          } else {
            // eslint-disable-next-line fp/no-mutation
            isSetMil = true;
          }
        }
        if (
          (isSetSev || isSetMod || isSetMil) &&
          (!prev || prev.date !== curr.date)
        ) {
          let newElems: AnticipatoryActionDataRow[] = [];
          if (isSetMil) {
            // eslint-disable-next-line fp/no-mutation
            newElems = [
              ...newElems,
              { ...curr, computedRow: true, category: 'Mild', phase: 'Set' },
            ];
          }
          if (isSetMod) {
            // eslint-disable-next-line fp/no-mutation
            newElems = [
              ...newElems,
              {
                ...curr,
                computedRow: true,
                category: 'Moderate',
                phase: 'Set',
              },
            ];
          }
          if (isSetSev) {
            // eslint-disable-next-line fp/no-mutation
            newElems = [
              ...newElems,
              { ...curr, computedRow: true, category: 'Severe', phase: 'Set' },
            ];
          }
          return [...acc, ...newElems];
        }
        return acc;
      }, [] as AnticipatoryActionDataRow[]);
    })
    .flat();

  const extended = [...parsed, ...extraRows];

  const validity: Validity = {
    mode: DatesPropagation.DEKAD,
    forward: 3,
  };

  const monitoredDistricts = [...new Set(extended.map(x => x.district))];
  const emptyDistricts = Object.fromEntries(
    monitoredDistricts.map(x => [x, [] as AnticipatoryActionDataRow[]]),
  );

  const windowData = AAWindowKeys.map(windowKey => {
    const filtered = extended.filter(x => x.window === windowKey);

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

const emptyWindows = {
  'Window 1': {},
  'Window 2': {},
} as AnticipatoryActionState['renderedDistricts'];

const initialState: AnticipatoryActionState = {
  data: {},
  availableDates: undefined,
  filters: {
    selectedDate: undefined,
    selectedWindow: allWindowsKey,
    categories: {
      Severe: true,
      Moderate: true,
      Mild: true,
      na: true,
      ny: true,
    },
  },
  renderedDistricts: emptyWindows,
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
  filters: AnticipatoryActionState['filters'];
  data: AnticipatoryActionState['data'];
}

function calculateMapRenderedDistricts({
  filters,
  data,
}: CalculateMapRenderedDistrictsParams) {
  const { selectedDate, categories } = filters;
  const res = Object.entries(data)
    .map(([winKey, districts]) => {
      if (!districts) {
        return undefined;
      }
      const entries = Object.entries(districts).map(
        ([districtName, districtData]) => {
          const dateData = districtData.filter(x => x.date === selectedDate);
          if (dateData.length === 0) {
            return [
              districtName,
              { category: 'ny', phase: 'ny', isNew: false },
            ];
          }

          const validData = dateData.filter(
            x =>
              (x.computedRow ||
                (!Number.isNaN(x.probability) && x.probability >= x.trigger)) &&
              categories[x.category],
          );
          if (validData.length === 0) {
            return [
              districtName,
              { category: 'na', phase: 'na', isNew: false },
            ];
          }

          const max = validData.reduce((m, curr) => {
            if (
              AADataSeverityOrder(curr.category, curr.phase) >
              AADataSeverityOrder(m.category, m.phase)
            ) {
              return curr;
            }
            return m;
          }, validData[0]);
          return [
            districtName,
            {
              category: max.category,
              phase: max.phase,
              isNew: max.computedRow ? false : max.new,
            },
          ];
        },
      );
      return [
        winKey,
        Object.fromEntries(entries) as {
          [district: string]: {
            category: AACategoryType;
            phase: AAPhaseType;
            isNew: boolean;
          };
        },
      ];
    })
    .filter((x): x is any[] => x !== undefined);

  const obj = Object.fromEntries(res) as {
    [windowKey: string]: {
      [district: string]: {
        category: AACategoryType;
        phase: AAPhaseType;
        isNew: boolean;
      };
    };
  };

  return { ...emptyWindows, ...obj };
}

export const anticipatoryActionStateSlice = createSlice({
  name: 'anticipatoryActionState',
  initialState,
  reducers: {
    setAAFilters: (
      state,
      {
        payload,
      }: PayloadAction<
        Partial<{
          selectedDate: string | undefined;
          selectedWindow: typeof AAWindowKeys[number] | typeof allWindowsKey;
          categories: Partial<Record<AACategoryType, boolean>>;
        }>
      >,
    ) => {
      const { categories, ...rest } = payload;
      const newCategories =
        categories !== undefined
          ? { ...state.filters.categories, ...categories }
          : state.filters.categories;
      const newFilters = {
        ...state.filters,
        ...rest,
        categories: newCategories,
      };
      return {
        ...state,
        filters: newFilters,
        renderedDistricts: calculateMapRenderedDistricts({
          filters: newFilters,
          data: state.data,
        }),
      };
    },
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
export const AADataSelector = (state: RootState) =>
  state.anticipatoryActionState.data;

export const AAAvailableDatesSelector = (state: RootState) =>
  state.anticipatoryActionState.availableDates;

export const AAFiltersSelector = (state: RootState) =>
  state.anticipatoryActionState.filters;

export const AARenderedDistrictsSelector = (state: RootState) =>
  state.anticipatoryActionState.renderedDistricts;

// export actions
export const { setAAFilters } = anticipatoryActionStateSlice.actions;

export default anticipatoryActionStateSlice.reducer;
