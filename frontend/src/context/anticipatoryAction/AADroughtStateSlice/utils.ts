import {
  AADataSeverityOrder,
  getAAIcon,
} from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionDroughtPanel/utils';
import { calculateSeason } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionDroughtPanel/utils/countryConfig';
import {
  DatesPropagation,
  ReferenceDateTimestamp,
  Validity,
} from 'config/types';
import { AAWindowKeys } from 'config/utils';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import { generateIntermediateDateItemFromValidity } from 'utils/server-utils';

import {
  AACategoryType,
  AAPhaseType,
  AnticipatoryActionDataRow,
  AnticipatoryActionState,
} from './types';

export const AACSVKeys: string[] = [
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
  const nonEmpty = data.filter(x => !!x.prob_ready); // filter empty rows
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
        season: x.season,
      };

      const isReadyValid = Number(x.prob_ready) > Number(x.trigger_ready);

      const ready = {
        phase: 'Ready',
        probability: Number(x.prob_ready),
        trigger: Number(x.trigger_ready),
        date: x.date_ready,
        isValid: isReadyValid,
        isOtherPhaseValid:
          isReadyValid && Number(x.prob_set) > Number(x.trigger_set),
      };

      const set = {
        phase: 'Set',
        probability: Number(x.prob_set),
        trigger: Number(x.trigger_set),
        date: x.date_set,
        isValid: ready.isValid && Number(x.prob_set) > Number(x.trigger_set),
        isOtherPhaseValid: isReadyValid,
      };

      const result = [];
      if (x.prob_ready !== undefined && x.prob_ready !== '') {
        result.push({ ...common, ...ready });
      }
      if (x.prob_set !== undefined && x.prob_set !== '') {
        result.push({ ...common, ...set });
      }
      return result;
    })
    .flat() as AnticipatoryActionDataRow[];

  const validity: Validity = {
    mode: DatesPropagation.DEKAD,
    forward: 3,
  };

  const districtNames = [
    ...new Set(data.filter(x => x.district).map(x => x.district)),
  ];
  const emptyDistricts = Object.fromEntries(
    districtNames.map(x => [x, [] as AnticipatoryActionDataRow[]]),
  );

  const windowData = AAWindowKeys.map(windowKey => {
    const filtered = parsed.filter(x => x.window === windowKey && x.date);

    const dates: ReferenceDateTimestamp[] = [
      ...new Set(
        filtered.map(x => new Date(x.date).getTime() as ReferenceDateTimestamp),
      ),
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

    const windowDates = [...new Set(filtered.map(x => x.date))].sort();

    const computedExtraRows: [string, AnticipatoryActionDataRow[]][] =
      Array.from(groupedByDistrict.entries()).map(([district, aaData]) => {
        const sorted = aaData.sort((a, b) => -sortFn(a, b));
        let setElementsToPropagate = [] as AnticipatoryActionDataRow[];
        let newRows = [] as AnticipatoryActionDataRow[];

        let prevMax: AnticipatoryActionDataRow | undefined;
        windowDates.forEach(date => {
          const dateData = sorted.filter(x => x.date === date);

          // Filter out 'Ready' if 'Set' exists for the same category on this date
          let filteredDateData = dateData;
          const setCategories = dateData
            .filter(x => x.phase === 'Set' && x.isValid)
            .map(x => x.category);
          if (setCategories.length > 0) {
            filteredDateData = dateData.filter(
              x => !(x.phase === 'Ready' && setCategories.includes(x.category)),
            );
          }

          // Propagate SET elements from previous dates
          const propagatedSetElements = setElementsToPropagate.map(x => ({
            ...x,
            computedRow: true,
            new: false,
            date,
          }));

          // If a district reaches a set state, it will propagate until the end of the window
          filteredDateData.forEach(x => {
            // reset prevMax when entering a new season
            if (prevMax && x.season !== prevMax.season) {
              prevMax = undefined;
            }
            if (!x.isValid) {
              return;
            }
            if (x.phase === 'Set') {
              setElementsToPropagate = [...setElementsToPropagate, x];
            }
            // set new parameter
            if (
              prevMax === undefined ||
              AADataSeverityOrder(x.category, x.phase) >
                AADataSeverityOrder(prevMax.category, prevMax.phase)
            ) {
              prevMax = x;

              x.new = true;
            }
          });

          newRows = [...newRows, ...filteredDateData, ...propagatedSetElements];
        });
        return [district, newRows];
      });

    const result = Object.fromEntries(
      computedExtraRows.map(x => [x[0], x[1].sort((a, b) => -sortFn(a, b))]),
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
    vulnerability: windowData.map(x => x.data[dist]).flat()[0]?.vulnerability,
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
  const season = calculateSeason(selectedDate);

  const res = Object.entries(data)
    .map(([winKey, districts]) => {
      if (!districts) {
        return undefined;
      }
      const entries = Object.entries(districts).map(
        ([districtName, districtData]) => {
          if (
            !selectedDate ||
            districtData.filter(
              x => x.date <= selectedDate && season === x.season,
            )?.length === 0
          ) {
            return [
              districtName,
              [{ category: 'ny', phase: 'ny', isNew: false }],
            ];
          }

          // keep showing latest window data, even for later dates
          const range = windowRanges[winKey as (typeof AAWindowKeys)[number]];
          const date =
            range?.end === undefined || selectedDate < range.end
              ? selectedDate
              : range.end;

          // For SET phases, look for data <= date to continue showing previous SET states
          // For other phases, use exact date match
          let dateData = districtData.filter(
            x => x.date === date && x.season === season,
          );

          // If no exact match found, look for SET phases with date <= selected date and take the last one
          if (dateData.length === 0) {
            dateData = districtData
              .filter(
                x =>
                  x.date <= date &&
                  x.season === season &&
                  x.phase === 'Set' &&
                  x.isValid,
              )
              .slice(-1)
              .map(x => ({ ...x, computedRow: true }));
          }

          const allValidData = dateData.filter(x => x.computedRow || x.isValid);
          if (allValidData.length === 0) {
            return [
              districtName,
              [{ category: 'na', phase: 'na', isNew: false }],
            ];
          }

          // districts whose categories are all filtered out are hidden (empty list)
          const validData = allValidData.filter(x => categories[x.category]);

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

type AADistrictMapData = {
  [district: string]: {
    category: AACategoryType;
    phase: AAPhaseType;
    isNew: boolean;
  };
};

export function calculateCombinedAAMapData(
  renderedDistricts: AnticipatoryActionState['renderedDistricts'],
): AADistrictMapData {
  const districts = new Set([
    ...Object.keys(renderedDistricts['Window 1']),
    ...Object.keys(renderedDistricts['Window 2']),
  ]);
  return Object.fromEntries(
    [...districts]
      .map(district => {
        const windowOneData = renderedDistricts['Window 1'][district]?.[0];
        const windowTwoData = renderedDistricts['Window 2'][district]?.[0];
        // a district can be hidden by filters in one window only
        if (!windowOneData || !windowTwoData) {
          const data = windowOneData ?? windowTwoData;
          return data ? [district, data] : null;
        }
        const windowOneSev = AADataSeverityOrder(
          windowOneData.category,
          windowOneData.phase,
        );
        const windowTwoSev = AADataSeverityOrder(
          windowTwoData.category,
          windowTwoData.phase,
        );
        return [
          district,
          windowOneSev >= windowTwoSev ? windowOneData : windowTwoData,
        ];
      })
      .filter((x): x is any => x !== null),
  );
}

// Data shown on the map for each visible district, for the selected window
export function getAAMapData(
  renderedDistricts: AnticipatoryActionState['renderedDistricts'],
  selectedWindow: AnticipatoryActionState['filters']['selectedWindow'],
): AADistrictMapData {
  if (selectedWindow === 'All') {
    return calculateCombinedAAMapData(renderedDistricts);
  }
  if (!selectedWindow) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(renderedDistricts[selectedWindow])
      .filter(([, values]) => values.length > 0)
      .map(([dist, values]) => [dist, values[0]]),
  );
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
  const AADistricts = getAAMapData(renderedDistricts, selectedWindow);

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
