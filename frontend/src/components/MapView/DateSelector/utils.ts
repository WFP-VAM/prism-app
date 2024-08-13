import { DateCompatibleLayer } from 'utils/server-utils';
import { DateItem } from 'config/types';
import { datesAreEqualWithoutTime } from 'utils/date-utils';

export const TIMELINE_ITEM_WIDTH = 4;

export type DateCompatibleLayerWithDateItems = DateCompatibleLayer & {
  dateItems: DateItem[];
};

/**
 * Binary search to return index of available dates that matched
 * @param availableDates in millisecond format, should be sorted
 * @param date in millisecond format
 * @return
 */
export function findDateIndex(
  availableDates: ReturnType<Date['getTime']>[],
  date: number | undefined,
) {
  if (!date) {
    return -1;
  }
  let startIndex = 0;
  let endIndex = availableDates.length - 1;
  while (startIndex <= endIndex) {
    const midIndex = Math.floor((startIndex + endIndex) / 2);
    if (datesAreEqualWithoutTime(availableDates[midIndex], date)) {
      return midIndex;
    }
    if (midIndex === startIndex && endIndex - startIndex <= 1) {
      if (date > availableDates[endIndex] && availableDates[endIndex + 1]) {
        return availableDates[endIndex + 1] - date >
          date - availableDates[endIndex]
          ? endIndex
          : endIndex + 1;
      }
      if (date < availableDates[endIndex] && availableDates[endIndex - 1]) {
        return availableDates[endIndex] - date >
          date - availableDates[endIndex - 1]
          ? endIndex - 1
          : endIndex;
      }
      return availableDates[endIndex] - date > date - availableDates[startIndex]
        ? startIndex
        : endIndex;
    }
    if (date < availableDates[midIndex]) {
      // eslint-disable-next-line fp/no-mutation
      endIndex = midIndex - 1;
    } else {
      // eslint-disable-next-line fp/no-mutation
      startIndex = midIndex + 1;
    }
  }
  return -1;
}
