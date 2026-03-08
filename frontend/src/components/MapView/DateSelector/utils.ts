import { DateCompatibleLayer, getRequestDate } from 'utils/server-utils';
import {
  DateItem,
  DisplayDateTimestamp,
  SelectedDateTimestamp,
} from 'config/types';
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
      endIndex = midIndex - 1;
    } else {
      startIndex = midIndex + 1;
    }
  }
  return -1;
}

export const getDefaultCompatibleDate = (
  availableDates: ReturnType<Date['getTime']>[],
  selectedDate?: number,
): DisplayDateTimestamp | undefined => {
  if (selectedDate !== undefined) {
    return selectedDate as DisplayDateTimestamp;
  }

  return availableDates.at(-1) as DisplayDateTimestamp | undefined;
};

export const getAdjacentCompatibleDate = (
  availableDates: ReturnType<Date['getTime']>[],
  currentDate: number | undefined,
  direction: 'forward' | 'back',
): DisplayDateTimestamp | undefined => {
  if (currentDate === undefined || availableDates.length === 0) {
    return undefined;
  }

  const currentIndex = findDateIndex(availableDates, currentDate);
  if (currentIndex < 0) {
    return undefined;
  }

  const adjacentIndex =
    direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
  return availableDates[adjacentIndex] as DisplayDateTimestamp | undefined;
};

export const getNextObservationDate = (
  layers: DateCompatibleLayerWithDateItems[],
  currentDate: SelectedDateTimestamp | undefined,
): DisplayDateTimestamp | undefined => {
  if (currentDate === undefined) {
    return undefined;
  }

  return findMatchingDateBetweenLayers(
    layers.map(layer =>
      layer.dateItems.filter(
        dateItem =>
          dateItem.queryDate > currentDate &&
          (dateItem.queryDate as number) === (dateItem.displayDate as number),
      ),
    ),
    'forward',
  );
};

export const getPreviousObservationDate = (
  layers: DateCompatibleLayerWithDateItems[],
  currentDate: SelectedDateTimestamp | undefined,
): DisplayDateTimestamp | undefined => {
  if (currentDate === undefined) {
    return undefined;
  }

  return findMatchingDateBetweenLayers(
    layers.map(layer => {
      const currentQueryDate = getRequestDate(
        layer.dateItems,
        currentDate,
        !layer.id.includes('anticipatory_action'),
      );

      return layer.dateItems.filter(
        dateItem =>
          dateItem.queryDate < currentDate &&
          (dateItem.queryDate as number) === (dateItem.displayDate as number) &&
          (currentQueryDate === undefined ||
            !datesAreEqualWithoutTime(dateItem.queryDate, currentQueryDate)),
      );
    }),
    'back',
  );
};

// Finds the first DateItem that is available on all layers, as
// the query date for at least one layer, and in the validity of other layers
// layerDates must contain only observation dates:
// ie. queryDate === displayDate
// and already be filtered before/after the current selected date.
// Returns undefined if no date is available at all.
// For forward: returns the beginning of the next validity period (minimum of first dates).
// For back: returns the beginning of the previous validity period closest to current date (maximum of last dates).
export const findMatchingDateBetweenLayers = (
  layerDates: DateItem[][],
  direction: 'forward' | 'back',
): DisplayDateTimestamp | undefined => {
  // one of the layers has no more dates to check: there will be no match
  if (layerDates.every(ld => ld.length === 0)) {
    return undefined;
  }

  // For forward: take the first element (index 0) from each layer's filtered dates
  // For back: take the last element (index length - 1) from each layer's filtered dates
  const firstDates: DateItem[] = layerDates
    .map(l => l[direction === 'forward' ? 0 : l.length - 1])
    .filter(l => l); // remove undefined elements, which break min/max below

  if (direction === 'forward') {
    // Return the minimum date to get the beginning of the next validity period
    return Math.min(
      ...firstDates.map(di => di.displayDate),
    ) as DisplayDateTimestamp;
  }
  // Return the maximum date to get the beginning of the previous validity period closest to current date
  return Math.max(
    ...firstDates.map(di => di.displayDate),
  ) as DisplayDateTimestamp;
};
