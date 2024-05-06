import { AAWindowKeys } from 'config/utils';
import {
  AADataSeverityOrder,
  getAAIcon,
} from 'components/MapView/LeftPanel/AnticipatoryActionPanel/utils';
import { DatesPropagation, Validity } from 'config/types';
import { generateIntermediateDateItemFromValidity } from 'utils/server-utils';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
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
        vulnerability: x.vulnerability,
      };

      const isReadyValid = Number(x.prob_ready) > Number(x.trigger_ready);

      const ready = {
        phase: 'Ready',
        probability: Number(x.prob_ready),
        trigger: Number(x.trigger_ready),
        date: x.date_ready,
        isValid: isReadyValid,
      };

      const set = {
        phase: 'Set',
        probability: Number(x.prob_set),
        trigger: Number(x.trigger_set),
        date: x.date_set,
        isValid: ready.isValid && Number(x.prob_set) > Number(x.trigger_set),
        wasReadyValid: isReadyValid,
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

  const districtNames = [...new Set(parsed.map(x => x.district))];
  const emptyDistricts = Object.fromEntries(
    districtNames.map(x => [x, [] as AnticipatoryActionDataRow[]]),
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
      range: {
        start: getFormattedDate(dates[0], DateFormat.Default),
        end: getFormattedDate(dates[dates.length - 1], DateFormat.Default),
      },
      windowKey,
    };
  });

  const monitoredDistricts = districtNames.map(dist => ({
    name: dist,
    vulnerability:
      windowData.map(x => x.data[dist]).flat()[0]?.vulnerability ||
      'General Triggers',
  }));

  return { windowData, monitoredDistricts };
}

export const emptyWindows = {
  'Window 1': {},
  'Window 2': {},
};

interface CalculateMapRenderedDistrictsParams {
  filters: AnticipatoryActionState['filters'];
  data: AnticipatoryActionState['data'];
  windowRanges: AnticipatoryActionState['windowRanges'];
}

export function calculateMapRenderedDistricts({
  filters,
  data,
  windowRanges,
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

          // keep showing latest window data, even for later dates
          const range = windowRanges[winKey as typeof AAWindowKeys[number]];
          const date =
            range?.end === undefined || selectedDate < range.end
              ? selectedDate
              : range.end;

          const dateData = districtData.filter(x => x.date === date);
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
) {
  return Object.fromEntries(
    Object.entries(renderedDistricts['Window 1'])
      .map(([district, values]) => {
        const windowOneData = values[0];
        if (!windowOneData) {
          return null;
        }
        const windowOneSev = AADataSeverityOrder(
          windowOneData.category,
          windowOneData.phase,
        );

        const windowTwoData = renderedDistricts['Window 2'][district][0];
        if (!windowTwoData) {
          return null;
        }
        const windowTwoSev = AADataSeverityOrder(
          windowTwoData.category,
          windowTwoData.phase,
        );
        if (windowOneSev >= windowTwoSev) {
          return [district, windowOneData];
        }

        return [district, windowTwoData];
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

interface CalculateAAMarkersParams {
  renderedDistricts: AnticipatoryActionState['renderedDistricts'];
  selectedWindow: AnticipatoryActionState['filters']['selectedWindow'];
  districtCentroids: {
    [key: string]: any;
  };
}

export function calculateAAMarkers({
  renderedDistricts,
  selectedWindow,
  districtCentroids,
}: CalculateAAMarkersParams) {
  const AADistricts =
    selectedWindow === 'All'
      ? calculateCombinedAAMapData(renderedDistricts)
      : Object.fromEntries(
          Object.entries(
            renderedDistricts[selectedWindow],
          ).map(([dist, val]) => [dist, val[0]]),
        );

  return Object.entries(AADistricts).map(([district, { category, phase }]) => {
    const centroid = districtCentroids[district] || {
      geometry: { coordinates: [0, 0] },
    };
    const icon = getAAIcon(category, phase, true);

    return {
      district,
      longitude: centroid?.geometry.coordinates[0],
      latitude: centroid?.geometry.coordinates[1],
      icon,
      centroid,
    };
  });
}
