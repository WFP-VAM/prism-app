import { AAWindowKeys } from 'config/utils';
import {
  AACategoryType,
  AAPhase,
  AAPhaseType,
  AAcategory,
  AnticipatoryActionDataRow,
  AnticipatoryActionState,
} from 'context/anticipatoryActionStateSlice/types';

function getColumnKey(val: AnticipatoryActionDataRow): number {
  const { category, phase, isValid } = val;
  const catIndex = AAcategory.findIndex(x => x === category);
  const phaseIndex = AAPhase.findIndex(x => x === phase);
  if (!isValid) {
    return catIndex * 10;
  }
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
  const { selectedWindow, selectedIndex, categories } = filters;

  const windowData = (selectedWindow === 'All'
    ? AAWindowKeys
    : [selectedWindow]
  ).map(win => {
    const districtData = !!selectedDistrict && data[win][selectedDistrict];
    if (!districtData) {
      return [win, null];
    }

    const filtered = districtData.filter(
      x =>
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
      categoriesMap.set(
        key,
        val
          ? { status: val.status, data: [...val.data, x] }
          : {
              status: {
                category: x.category,
                phase: x.isValid ? x.phase : 'na',
              },
              data: [x],
            },
      );
    });
    return [win, { months, rows: Object.fromEntries(categoriesMap) }];
  }) as [
    typeof AAWindowKeys[number],
    {
      months: string[][];
      rows: { [id: string]: TimelineRow };
    } | null,
  ][];

  const allRows = windowData
    .map(([win, x]) =>
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