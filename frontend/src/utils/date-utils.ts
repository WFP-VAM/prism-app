import moment, { Moment } from 'moment';
import { DateItem } from '../config/types';
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATE_FORMAT_SNAKE_CASE,
} from './name-utils';

export interface StartEndDate {
  startDate?: number;
  endDate?: number;
}

export const datesAreEqualWithoutTime = (
  date1: number | Date,
  date2: number | Date,
): boolean => {
  const d1 = new Date(date1).setHours(0, 0, 0, 0);
  const d2 = new Date(date2).setHours(0, 0, 0, 0);
  return d1 === d2;
};

export const generateDatesRange = (
  startDate: Moment,
  endDate: Moment,
): number[] => {
  return Array.from(
    { length: endDate.diff(startDate, 'days') + 1 },
    (_, index) => startDate.clone().add(index, 'days').valueOf(),
  );
};

export const generateDateItemsRange = (
  startEndDateList: StartEndDate[],
): DateItem[] => {
  if (startEndDateList.length === 0) {
    return [];
  }

  return startEndDateList.flatMap(range => {
    const datesInTime: number[] = generateDatesRange(
      moment.utc(range.startDate),
      moment.utc(range.endDate),
    );

    const dateItems: DateItem[] = datesInTime.map(dateInTime => ({
      displayDate: dateInTime,
      queryDate: range.startDate!,
    }));

    // eslint-disable-next-line fp/no-mutation
    dateItems[0].isStartDate = true;
    // eslint-disable-next-line fp/no-mutation
    dateItems[dateItems.length - 1].isEndDate = true;

    return dateItems;
  });
};

// search array of timestamps for a given timestamp, using
// the binary search algorithm.
// The array MUST be sorted in ascending order.
// Use callback to extract timestamp values from array items.
export function binaryFind<T extends any>(
  arr: T[],
  ts: number,
  cb: (x: T) => number,
): number {
  let left = 0;
  let right = arr.length - 1;
  while (left <= right) {
    const testIdx = Math.floor((left + right) / 2);
    const val = cb(arr[testIdx]);
    if (val < ts) {
      // eslint-disable-next-line fp/no-mutation
      left = testIdx + 1;
    } else if (val > ts) {
      // eslint-disable-next-line fp/no-mutation
      right = testIdx - 1;
    } else {
      return testIdx;
    }
  }
  return -1;
}

// check if an array includes the given value using
// the binary search algorithm.
// The array MUST be sorted in ascending order.
// Use callback to extract timestamp values from array items.
export function binaryIncludes<T extends any>(
  arry: T[],
  timestamp: number,
  callback: (x: T) => number,
): boolean {
  return binaryFind(arry, timestamp, callback) > -1;
}

export const dateStrToUpperCase = (dateStr: string): string => {
  return `${dateStr.slice(0, 1).toUpperCase()}${dateStr.slice(1)}`;
};

export const getDateFormat = (
  date: number | string | undefined,
  format: 'default' | 'snake',
) => {
  if (date === undefined) {
    return undefined;
  }

  switch (format) {
    case 'default':
      return moment(date).format(DEFAULT_DATE_FORMAT);
    case 'snake':
      return moment(date).format(DEFAULT_DATE_FORMAT_SNAKE_CASE);

    default:
      throw new Error(`Invalid format: ${format}`);
  }
};

export const getMillisecondsFromISO = (date: string) => moment(date).valueOf();
