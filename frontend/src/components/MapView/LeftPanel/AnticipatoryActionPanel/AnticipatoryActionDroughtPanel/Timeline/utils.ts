import { AAWindowKeys } from 'config/utils';
import {
  AACategoryType,
  AAPhase,
  AAPhaseType,
  AAcategory,
  AnticipatoryActionDataRow,
  AnticipatoryActionState,
} from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { calculateSeason } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionDroughtPanel/utils/countryConfig';

function getColumnKey(val: AnticipatoryActionDataRow): number {
  const { category, phase } = val;
  const catIndex = AAcategory.findIndex(x => x === category);
  const phaseIndex = AAPhase.findIndex(x => x === phase);
  return catIndex * 10 + phaseIndex;
}

export type TimelineRow = {
  status: {
    category: AACategoryType;
    phase: AAPhaseType;
  };
  data: AnticipatoryActionDataRow[];
};

interface TimelineTransformParams {
  filters: AnticipatoryActionState['filters'];
  selectedDistrict: AnticipatoryActionState['selectedDistrict'];
  data: AnticipatoryActionState['data'];
}

export function timelineTransform({
  filters,
  selectedDistrict,
  data,
}: TimelineTransformParams) {
  const { selectedWindow, selectedIndex, categories, selectedDate } = filters;
  const season = calculateSeason(selectedDate);

  const windowData = (
    selectedWindow === 'All' ? AAWindowKeys : [selectedWindow]
  ).map(win => {
    const districtData = !!selectedDistrict && data[win][selectedDistrict];
    if (!districtData) {
      return [win, null];
    }

    const filtered = districtData.filter(
      x =>
        x.season === season &&
        !x.computedRow &&
        (selectedIndex === '' || selectedIndex === x.index) &&
        categories[x.category],
    );

    const months = [...new Set(filtered.map(x => x.date))].map(x => [
      x,
      new Date(x).toLocaleString('en-US', { month: 'short' }),
    ]);

    const categoriesMap = new Map<
      number,
      {
        status: { category: AACategoryType; phase: AAPhaseType };
        data: AnticipatoryActionDataRow[];
      }
    >();
    filtered.forEach(x => {
      const key = getColumnKey(x);
      const val = categoriesMap.get(key);
      if (val) {
        // Sort the new data based on validity

        const sortedData = [
          x,
          ...val.data.filter(item => item.date === x.date),
        ].sort((a, b) => {
          if (a.isValid && a.isOtherPhaseValid) {
            return -1;
          }
          if (b.isValid && b.isOtherPhaseValid) {
            return 1;
          }
          if (a.isValid) {
            return -1;
          }
          if (b.isValid) {
            return 1;
          }
          return 0;
        });

        // Keep only the highest priority item for this date
        const highestPriorityItem = sortedData[0];

        // Update the data array

        val.data = [
          ...val.data.filter(item => item.date !== x.date),
          highestPriorityItem,
        ];
      } else {
        categoriesMap.set(key, {
          status: {
            category: x.category,
            phase: x.phase,
          },
          data: [x],
        });
      }
    });
    return [win, { months, rows: Object.fromEntries(categoriesMap) }];
  }) as [
    (typeof AAWindowKeys)[number],
    {
      months: string[][];
      rows: { [id: string]: TimelineRow };
    } | null,
  ][];

  const allRows = windowData
    .map(([_win, x]) =>
      Object.entries(x?.rows || {}).map(([id, info]) => [
        id,
        { status: info.status, data: [] },
      ]),
    )
    .flat() as [string, TimelineRow][];

  return {
    windowData: Object.fromEntries(windowData),
    allRows: Object.fromEntries(allRows),
  };
}
