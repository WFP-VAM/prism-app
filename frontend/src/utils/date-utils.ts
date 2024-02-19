import { DateItem } from '../config/types';
import { DateFormat } from './name-utils';

export interface StartEndDate {
  startDate?: number;
  endDate?: number;
}

export const datesAreEqualWithoutTime = (
  date1: number | Date,
  date2: number | Date,
): boolean => {
  const d1 = new Date(date1).setUTCHours(0, 0, 0, 0);
  const d2 = new Date(date2).setUTCHours(0, 0, 0, 0);
  return d1 === d2;
};

function diffInDays(date1: Date, date2: Date) {
  const date1InMs = date1.getTime();
  const date2InMs = date2.getTime();

  const differenceInMs = Math.abs(date1InMs - date2InMs);

  const diff = Math.floor(differenceInMs / (1000 * 60 * 60 * 24));

  return diff;
}

export const generateDatesRange = (
  startDate: Date,
  endDate: Date,
): number[] => {
  return Array.from(
    { length: diffInDays(startDate, endDate) + 1 },
    (_, index) => {
      const clone = new Date(startDate.getTime());
      clone.setDate(startDate.getDate() + index);
      return clone.getTime();
    },
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
      new Date(range.startDate || 0),
      new Date(range.endDate || 0),
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

export const getFormattedDate = (
  date: number | string | undefined | Date,
  format:
    | 'default'
    | 'snake'
    | DateFormat.DefaultSnakeCase
    | DateFormat.Default
    | DateFormat.DateTime
    | DateFormat.DayFirstSnakeCase
    | DateFormat.ISO,
) => {
  if (date === undefined) {
    return undefined;
  }

  const jsDate = new Date(date);
  const year = jsDate.getUTCFullYear();
  const month = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jsDate.getUTCDate()).padStart(2, '0');

  switch (format) {
    case 'default':
    case DateFormat.Default:
      return `${year}-${month}-${day}`;
    case 'snake':
    case DateFormat.DefaultSnakeCase:
      return `${year}_${month}_${day}`;
    case DateFormat.DayFirstSnakeCase:
      return `${day}_${month}_${year}`;
    case DateFormat.DateTime:
    case DateFormat.ISO: {
      const hours = String(jsDate.getUTCHours()).padStart(2, '0');
      const minutes = String(jsDate.getUTCMinutes()).padStart(2, '0');
      switch (format) {
        case DateFormat.DateTime:
          return `${year}-${month}-${day} ${hours}:${minutes}`;
        case DateFormat.ISO: {
          const seconds = String(jsDate.getUTCSeconds()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        }
        default:
          throw new Error(`Invalid format: ${format}`);
      }
    }

    default:
      throw new Error(`Invalid format: ${format}`);
  }
};

export const getTimeInMilliseconds = (date: string | number) =>
  new Date(date).getTime();
