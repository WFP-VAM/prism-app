import { AAWindowKeys } from 'config/utils';
import { AADataSeverityOrder } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/utils';
import { DatesPropagation, Validity } from 'config/types';
import { generateIntermediateDateItemFromValidity } from 'utils/server-utils';
import {
  AACategoryType,
  AAPhaseType,
  AnticipatoryActionDataRow,
  AnticipatoryActionState,
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

export function parseAndTransformAA(data: any[]) {
  const nonEmpty = data.filter(x => !!x[AACSVKeys[0]]); // filter empty rows
  const parsed = nonEmpty
    .map(x => {
      const common = {
        category: x.category,
        district: x.district,
        index: x.index,
        type: x.type,
        window: x.window,
        // initialize to false and override later
        new: false,
      };

      const ready = {
        phase: 'Ready',
        probability: Number(x.prob_ready),
        trigger: Number(x.trigger_ready),
        date: x.date_ready,
        isValid: Number(x.prob_ready) > Number(x.trigger_ready),
      };

      const set = {
        phase: 'Set',
        probability: Number(x.prob_set),
        trigger: Number(x.trigger_set),
        date: x.date_set,
        isValid: ready.isValid && Number(x.prob_set) > Number(x.trigger_set),
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
      let setElementsToPropagate = [] as AnticipatoryActionDataRow[];
      let newRows = [] as AnticipatoryActionDataRow[];

      let prevMax: AnticipatoryActionDataRow | undefined;
      windowDates.forEach((date, index) => {
        const dateData = sorted.filter(x => x.date === date);

        // Propagate SET elements from previous dates
        const propagatedSetElements = setElementsToPropagate.map(x => ({
          ...x,
          computedRow: true,
          new: false,
          date,
        }));

        // If a district reaches a set state, it will propagate until the end of the window
        dateData.forEach(x => {
          if (!x.isValid) {
            return;
          }
          if (x.phase === 'Set') {
            // eslint-disable-next-line fp/no-mutation
            setElementsToPropagate = [...setElementsToPropagate, x];
          }
          // set new parameter
          if (
            prevMax === undefined ||
            AADataSeverityOrder(x.category, x.phase) >
              AADataSeverityOrder(prevMax.category, prevMax.phase)
          ) {
            // eslint-disable-next-line fp/no-mutation
            prevMax = x;
            // eslint-disable-next-line fp/no-mutation, no-param-reassign
            x.new = true;
          }
        });

        // eslint-disable-next-line no-const-assign, fp/no-mutation
        newRows = [...newRows, ...dateData, ...propagatedSetElements];
      });
      return [district, newRows];
    });

    const result = Object.fromEntries(
      computedExtraRows.map(x => [
        x[0],
        // eslint-disable-next-line fp/no-mutating-methods
        x[1].sort((a, b) => -sortFn(a, b)),
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

export const emptyWindows = {
  'Window 1': {},
  'Window 2': {},
} as AnticipatoryActionState['renderedDistricts'];

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
          if (
            !selectedDate ||
            districtData.filter(x => x.date <= selectedDate)?.length === 0
          ) {
            return [
              districtName,
              [{ category: 'ny', phase: 'ny', isNew: false }],
            ];
          }
          const dateData = districtData.filter(x => x.date === selectedDate);
          const validData = dateData.filter(
            x => (x.computedRow || x.isValid) && categories[x.category],
          );
          if (validData.length === 0) {
            return [
              districtName,
              [{ category: 'na', phase: 'na', isNew: false }],
            ];
          }

          // eslint-disable-next-line fp/no-mutating-methods
          const sorted = validData.sort(sortFn);
          return [
            districtName,
            sorted.map(x => ({
              category: x.category,
              phase: x.phase,
              isNew: x.computedRow ? false : x.new,
            })),
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
          }[];
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

export function calculateCombinedAAMapData(
  renderedDistricts: AnticipatoryActionState['renderedDistricts'],
  windowKey: typeof AAWindowKeys[number],
) {
  const otherWindowKey = AAWindowKeys.find(x => x !== windowKey);
  if (!otherWindowKey) {
    // this is never supposed to happen
    throw new Error('Unknown window key');
  }
  return Object.fromEntries(
    Object.entries(renderedDistricts[windowKey])
      .map(([district, values]) => {
        const val = values[0];
        if (!val) {
          return null;
        }
        const thisWindowsSev = AADataSeverityOrder(val.category, val.phase);

        const otherWindowData = renderedDistricts[otherWindowKey][district][0];
        if (!otherWindowData) {
          return null;
        }
        const otherWindowSev = AADataSeverityOrder(
          otherWindowData.category,
          otherWindowData.phase,
        );
        if (thisWindowsSev > otherWindowSev) {
          return [district, val];
        }
        if (thisWindowsSev < otherWindowSev) {
          return null;
        }
        if (windowKey === 'Window 1') {
          return [district, val];
        }
        return null;
      })
      .filter((x): x is any => x !== null),
  ) as {
    [district: string]: {
      category: AACategoryType;
      phase: AAPhaseType;
      isNew: boolean;
    };
  };
}
