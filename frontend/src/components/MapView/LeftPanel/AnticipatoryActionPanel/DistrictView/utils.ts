import {
  AnticipatoryActionDataRow,
  AnticipatoryActionState,
} from 'context/anticipatoryActionStateSlice/types';
import { AADataSeverityOrder } from '../utils';

export function districtViewTransform(
  data: AnticipatoryActionDataRow[] | undefined,
  filters: AnticipatoryActionState['filters'],
) {
  if (!data) {
    return undefined;
  }
  const { categories: categoryFilters, selectedIndex } = filters;

  const validData = data.filter(
    x =>
      (x.computedRow || x.isValid) &&
      categoryFilters[x.category] &&
      (selectedIndex === '' || x.index === selectedIndex),
  );

  const monthsMap = new Map<string, AnticipatoryActionDataRow[]>();
  validData.forEach(x => {
    const val = monthsMap.get(x.date);
    monthsMap.set(x.date, val ? [...val, x] : [x]);
  });

  // eslint-disable-next-line fp/no-mutating-methods
  const months = Array.from(monthsMap.keys()).sort();

  const topFiltered = months
    .map(date => {
      const dateData = monthsMap.get(date);
      if (!dateData) {
        // this should never happen
        throw new Error('Invalid Date');
      }

      if (dateData.filter(x => !x.computedRow).length === 0) {
        return [];
      }

      const setCategories = new Set(
        dateData.filter(x => x.phase === 'Set').map(x => x.category),
      );
      const ret = dateData.filter(
        x => x.phase === 'Set' || !setCategories.has(x.category),
      );

      return ret;
    })
    .flat();

  const sevMap = new Map<number, AnticipatoryActionDataRow[]>();
  topFiltered.forEach(x => {
    const sevVal = AADataSeverityOrder(x.category, x.phase, 1);
    const val = sevMap.get(sevVal);
    sevMap.set(sevVal, val ? [...val, x] : [x]);
  });

  const transformed = Object.fromEntries(sevMap);

  return {
    months: Object.fromEntries(
      [...new Set(topFiltered.map(x => x.date))].map(x => [
        x,
        new Date(x).toLocaleString('en-US', { month: 'long' }),
      ]),
    ),
    transformed,
  };
}

export function dateSorter(
  a: [string, AnticipatoryActionDataRow[]],
  b: [string, AnticipatoryActionDataRow[]],
) {
  if (a[0] > b[0]) {
    return -1;
  }
  if (a[0] < b[0]) {
    return 1;
  }
  return 0;
}
