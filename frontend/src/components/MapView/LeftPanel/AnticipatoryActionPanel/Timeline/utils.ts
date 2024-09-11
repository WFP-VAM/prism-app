import { AAWindowKeys } from 'config/utils';
import {
  AACategoryType,
  AAPhase,
  AAPhaseType,
  AAcategory,
  AnticipatoryActionDataRow,
  AnticipatoryActionState,
} from 'context/anticipatoryActionStateSlice/types';
import { getSeason } from 'context/anticipatoryActionStateSlice/utils';

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
  const season = getSeason(selectedDate);

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
        // Prioritize valid elements when multiple indicators overlap on the same date
        const existingValidItem = val.data.find(
          item => item.isValid && item.date === x.date,
        );
        if (!existingValidItem || x.isValid) {
          // eslint-disable-next-line fp/no-mutation
          val.data = [...val.data.filter(item => item.date !== x.date), x];
        }
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
