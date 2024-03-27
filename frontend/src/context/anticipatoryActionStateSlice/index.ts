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

export function transform(data: any[]) {
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

    // eslint-disable-next-line fp/no-mutating-methods
    const windowDates = [...new Set(filtered.map(x => x.date))].sort();

    const computedExtraRows: [
      string,
      AnticipatoryActionDataRow[],
    ][] = Array.from(groupedByDistrict.entries()).map(([district, aaData]) => {
      // eslint-disable-next-line fp/no-mutating-methods
      const sorted = aaData.sort((a, b) => -sortFn(a, b));
      let isSetSev: boolean = false;
      let isSetMod: boolean = false;
      let isSetMil: boolean = false;

      let newRows = [] as AnticipatoryActionDataRow[];
      const sampleElem = aaData[0];

      windowDates.forEach(date => {
        const dateData = sorted.filter(x => x.date === date);

        dateData.forEach(x => {
          if (x.probability > x.trigger && x.phase === 'Set') {
            if (x.category === 'Severe') {
              // eslint-disable-next-line fp/no-mutation
              isSetSev = true;
            } else if (x.category === 'Moderate') {
              // eslint-disable-next-line fp/no-mutation
              isSetMod = true;
            } else {
              // eslint-disable-next-line fp/no-mutation
              isSetMil = true;
            }
          }
        });

        const prev =
          newRows.length > 0 ? newRows[newRows.length - 1] : undefined;
        if (
          (isSetSev || isSetMod || isSetMil) &&
          (!prev || prev.date !== date)
        ) {
          let newElems: AnticipatoryActionDataRow[] = [];
          if (isSetMil) {
            // eslint-disable-next-line fp/no-mutation
            newElems = [
              ...newElems,
              {
                ...sampleElem,
                computedRow: true,
                category: 'Mild',
                phase: 'Set',
                date,
              },
            ];
          }
          if (isSetMod) {
            // eslint-disable-next-line fp/no-mutation
            newElems = [
              ...newElems,
              {
                ...sampleElem,
                computedRow: true,
                category: 'Moderate',
                phase: 'Set',
                date,
              },
            ];
          }
          if (isSetSev) {
            // eslint-disable-next-line fp/no-mutation
            newElems = [
              ...newElems,
              {
                ...sampleElem,
                computedRow: true,
                category: 'Severe',
                phase: 'Set',
                date,
              },
            ];
          }
          // eslint-disable-next-line no-const-assign, fp/no-mutation
          newRows = [...newRows, ...newElems];
        }
      });

      return [district, [...aaData, ...newRows]];
    });

    const result = Object.fromEntries(
      computedExtraRows.map(x => [
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

export function calculateMapRenderedDistricts({
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
