import {
  AnticipatoryActionDataRow,
  AnticipatoryActionState,
} from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { calculateSeason } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionDroughtPanel/utils/countryConfig';
import { AADataSeverityOrder } from '../utils';
import { TimelineRow } from '../Timeline/utils';

export function districtViewTransform(
  data: AnticipatoryActionDataRow[] | undefined,
  filters: AnticipatoryActionState['filters'],
) {
  if (!data) {
    return undefined;
  }
  const { categories: categoryFilters, selectedIndex, selectedDate } = filters;
  const season = calculateSeason(selectedDate);

  // Keep valid data only and switch SET phase to 'na' if the READY was not valid
  const validData = data
    .filter(
      x =>
        categoryFilters[x.category] &&
        season === x.season &&
        (selectedIndex === '' || x.index === selectedIndex),
    )
    .map(x => {
      if (x.isValid) {
        return x;
      }
      return {
        ...x,
        phase: 'na',
      } as AnticipatoryActionDataRow;
    });

  const monthsMap = new Map<string, AnticipatoryActionDataRow[]>();
  validData.forEach(x => {
    const val = monthsMap.get(x.date);
    monthsMap.set(x.date, val ? [...val, x] : [x]);
  });

  const months = Array.from(monthsMap.keys()).sort();

  const topFiltered = months
    .map(date => {
      const dateData = monthsMap.get(date);
      if (!dateData) {
        // this should never happen
        throw new Error('Invalid Date');
      }

      if (dateData.every(x => x.computedRow)) {
        return [];
      }

      const setCategories = new Set(
        dateData.filter(x => x.phase === 'Set').map(x => x.category),
      );

      const readyCategories = new Set(
        dateData.filter(x => x.phase === 'Ready').map(x => x.category),
      );

      // only keep data for the highest phase by category
      const ret = dateData.filter(
        x =>
          x.phase === 'Set' ||
          (x.phase === 'Ready' && !setCategories.has(x.category)) ||
          (x.phase === 'na' &&
            !setCategories.has(x.category) &&
            !readyCategories.has(x.category)),
      );

      return ret;
    })
    .flat();

  const sevMap = new Map<number, AnticipatoryActionDataRow[]>();
  topFiltered.forEach(x => {
    // return category data on one line by setting phase bonus to 0
    const sevVal = AADataSeverityOrder(x.category, x.phase, 0);
    const val = sevMap.get(sevVal);
    sevMap.set(sevVal, val ? [...val, x] : [x]);
  });

  const transformed = Object.fromEntries(sevMap);

  return {
    months: Object.fromEntries(
      [...new Set(topFiltered.map(x => x.date))].map(x => [
        x,
        new Date(x).toLocaleString('en-US', { month: 'short' }),
      ]),
    ),
    transformed,
  };
}

export function dateSorter(
  a: [string, AnticipatoryActionDataRow[] | TimelineRow],
  b: [string, AnticipatoryActionDataRow[] | TimelineRow],
) {
  if (a[0] > b[0]) {
    return -1;
  }
  if (a[0] < b[0]) {
    return 1;
  }
  return 0;
}
