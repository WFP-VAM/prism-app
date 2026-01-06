import {
  CoverageEndDateTimestamp,
  CoverageStartDateTimestamp,
  DateItem,
  DisplayDateTimestamp,
  QueryDateTimestamp,
  SeasonBounds,
  SeasonBoundsConfig,
} from '../config/types';
import { DateFormat } from './name-utils';

export interface StartEndDate {
  startDate?: number;
  endDate?: number;
}

const millisecondsInADay = 24 * 60 * 60 * 1000;

export const getCurrentDateTimeForUrl = (): string =>
  new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');

export const dateWithoutTime = (date: number | Date): number => {
  const cleanDate = date instanceof Date ? date.getTime() : date;
  return cleanDate - (cleanDate % millisecondsInADay);
};

export const datesAreEqualWithoutTime = (
  date1: number | Date,
  date2: number | Date,
): boolean => {
  const cleanDate1 = date1 instanceof Date ? date1.getTime() : date1;
  const cleanDate2 = date2 instanceof Date ? date2.getTime() : date2;
  return (
    cleanDate1 - (cleanDate1 % millisecondsInADay) ===
    cleanDate2 - (cleanDate2 % millisecondsInADay)
  );
};

function diffInDays(date1: Date, date2: Date) {
  // Normalize both dates to midnight UTC
  const d1 = new Date(
    Date.UTC(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate()),
  );
  const d2 = new Date(
    Date.UTC(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate()),
  );

  const date1InMs = d1.getTime();
  const date2InMs = d2.getTime();

  const differenceInMs = Math.abs(date1InMs - date2InMs);

  const diff = Math.floor(differenceInMs / millisecondsInADay);

  return diff;
}

/**
 * Returns an array of timestamps (one per day) between startDate and endDate.
 */
export const generateDatesRange = (startDate: Date, endDate: Date): number[] =>
  Array.from({ length: diffInDays(startDate, endDate) + 1 }, (_, index) => {
    const clone = new Date(startDate.getTime());
    clone.setDate(startDate.getDate() + index);
    return clone.getTime();
  });

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
      displayDate: dateInTime as DisplayDateTimestamp,
      queryDate: range.startDate! as QueryDateTimestamp,
      startDate: range.startDate! as CoverageStartDateTimestamp,
      endDate: range.endDate! as CoverageEndDateTimestamp,
    }));

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
      left = testIdx + 1;
    } else if (val > ts) {
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

export const dateStrToUpperCase = (dateStr: string): string =>
  `${dateStr.slice(0, 1).toUpperCase()}${dateStr.slice(1)}`;

export const getFormattedDate = (
  date: number | string | undefined | Date,
  format:
    | 'default'
    | 'snake'
    | 'locale'
    | 'localeUTC'
    | 'monthDay'
    | 'localeShortUTC'
    | 'localeNumericUTC'
    | 'short'
    | 'shortDayFirst'
    | DateFormat.DefaultSnakeCase
    | DateFormat.Default
    | DateFormat.DateTime
    | DateFormat.DayFirstSnakeCase
    | DateFormat.DayFirstHyphen
    | DateFormat.ISO
    | DateFormat.MiddleEndian
    | DateFormat.TimeOnly
    | DateFormat.DayFirstHyphenMonthName
    | DateFormat.LocaleNumeric,
  dateLocale: string = 'default',
) => {
  if (date === undefined) {
    return undefined;
  }

  const jsDate = new Date(date);
  const year = jsDate.getUTCFullYear();
  const month = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
  const monthName = jsDate.toLocaleString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });
  const day = String(jsDate.getUTCDate()).padStart(2, '0');

  // Example for June 30th, 1999
  switch (format) {
    // Example: "1999-06-30"
    case 'default':
    case DateFormat.Default:
      return `${year}-${month}-${day}`;

    // Example: "1999_06_30"
    case 'snake':
    case DateFormat.DefaultSnakeCase:
      return `${year}_${month}_${day}`;

    // Example: "06/30"
    case 'short':
      return `${month}/${day}`;

    // Example: "30-06"
    case 'shortDayFirst':
      return `${day}-${month}`;

    // Example: "30_06_1999"
    case DateFormat.DayFirstSnakeCase:
      return `${day}_${month}_${year}`;

    // Example: "30-06-1999"
    case DateFormat.DayFirstHyphen:
      return `${day}-${month}-${year}`;

    // Example: "30-Jun-1999"
    case DateFormat.DayFirstHyphenMonthName:
      return `${day}-${monthName}-${year}`;

    // Example: "06/30/1999"
    case DateFormat.MiddleEndian:
      return `${month}/${day}/${year}`;

    case DateFormat.TimeOnly:
    case DateFormat.DateTime:
    case DateFormat.ISO: {
      const hours = String(jsDate.getUTCHours()).padStart(2, '0');
      const minutes = String(jsDate.getUTCMinutes()).padStart(2, '0');
      switch (format) {
        // Example: "00:00"
        case DateFormat.TimeOnly:
          return `${hours}:${minutes}`;
        // Example: "1999-06-30 00:00"
        case DateFormat.DateTime:
          return `${year}-${month}-${day} ${hours}:${minutes}`;
        // Example: "1999-06-30T00:00:00"
        case DateFormat.ISO: {
          const seconds = String(jsDate.getUTCSeconds()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        }
        default:
          throw new Error(`Invalid format: ${format}`);
      }
    }

    // Example: "Jun 30"
    case 'monthDay':
      return new Date(date).toLocaleString('default', {
        year: undefined,
        month: 'short',
        day: 'numeric',
      });

    // Example: "Jun 30, 1999"
    case 'localeShortUTC':
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });

    // Example: "06-30-1999" (US) or "30-06-1999" (Europe)
    case 'localeNumericUTC':
    case DateFormat.LocaleNumeric: {
      const parts = new Intl.DateTimeFormat(
        dateLocale === 'default' ? undefined : dateLocale,
        {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'UTC',
        },
      ).formatToParts(new Date(date));
      return parts
        .filter(p => p.type !== 'literal')
        .map(p => p.value)
        .join('-');
    }

    // Example: "June 30, 1999" (US) or "30 June 1999" (Europe, etc)
    case 'localeUTC':
      return new Date(date).toLocaleDateString(dateLocale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });

    // Example: "June 30, 1999" (US) or "30 June 1999" (Europe, etc)
    case 'locale':
      return new Date(date).toLocaleString(dateLocale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    default:
      throw new Error(`Invalid format: ${format}`);
  }
};

export const getTimeInMilliseconds = (date: string | number) =>
  new Date(date).getTime();

/**
 * Format a date coverage range for display.
 * @param startDate - Start date timestamp
 * @param endDate - End date timestamp
 * @param format - Date format to use (default: 'localeNumericUTC')
 * @returns Formatted range string or null if dates are missing
 */
export function formatCoverageRange(
  startDate?: number,
  endDate?: number,
  format: Parameters<typeof getFormattedDate>[1] = 'localeNumericUTC',
): string | null {
  if (!startDate || !endDate) {
    return null;
  }

  const startFormatted = getFormattedDate(startDate, format) as string;
  const endFormatted = getFormattedDate(endDate, format) as string;

  // If start and end are the same day, just show one date
  if (startFormatted === endFormatted) {
    return startFormatted ?? '';
  }

  return `${startFormatted} – ${endFormatted}`;
}

/**
 * Format layer coverage information as a single text string.
 * Used for both title placeholders and footer text.
 *
 * - Single layer: returns just the range (e.g., "11-Sept-2025 – 10-Oct-2025")
 * - Multiple layers: includes layer titles (e.g., "Rainfall: 11-Sept-2025 – 10-Oct-2025; IPC: 15-Sept-2025 – 20-Oct-2025")
 *
 * @param layersCoverage - Array of layer coverage objects
 * @param t - Optional translation function for layer titles
 * @param format - Date format to use (default: 'localeNumericUTC')
 * @returns Formatted coverage string or null if no valid coverage
 */
export function formatCoverageText(
  layersCoverage: Array<{
    layerTitle?: string;
    startDate?: number;
    endDate?: number;
  }>,
  t?: (key: string) => string,
  format?: Parameters<typeof getFormattedDate>[1],
): string | null {
  const translate = t ?? ((s: string) => s);

  const layersWithCoverage = layersCoverage
    .map(coverage => ({
      title: coverage.layerTitle,
      range: formatCoverageRange(coverage.startDate, coverage.endDate, format),
    }))
    .filter(item => item.range !== null);

  if (layersWithCoverage.length === 0) {
    return null;
  }

  // Single layer: just show the range
  if (layersWithCoverage.length === 1) {
    return layersWithCoverage[0].range;
  }

  // Multiple layers: show layer titles with ranges
  return layersWithCoverage
    .map(item => `${translate(item.title ?? '')}: ${item.range}`)
    .join('; ');
}

export const SEASON_MAP: [number, number][] = [
  [0, 2],
  [3, 5],
  [6, 8],
  [9, 11],
];

export const constructDateFromSeason = (
  date: Date,
  season: SeasonBoundsConfig,
): SeasonBounds => {
  const startCurrentYear = new Date(
    `${date.getUTCFullYear()}-${season.start}T12:00:00Z`,
  ).getTime();
  const endCurrentYear = new Date(
    `${date.getUTCFullYear()}-${season.end}T12:00:00Z`,
  ).getTime();
  const startPreviousYear = new Date(
    `${date.getUTCFullYear() - 1}-${season.start}T12:00:00Z`,
  ).getTime();
  const endNextYear = new Date(
    `${date.getUTCFullYear() + 1}-${season.end}T12:00:00Z`,
  ).getTime();

  return endCurrentYear >= startCurrentYear
    ? { start: new Date(startCurrentYear), end: new Date(endCurrentYear) }
    : date.getTime() >= startCurrentYear
      ? { start: new Date(startCurrentYear), end: new Date(endNextYear) }
      : { start: new Date(startPreviousYear), end: new Date(endCurrentYear) };
};

/**
 * Get the start and end date of the season for a given date.
 * @param date The date to get the season for.
 * @param seasonBounds The season bounds to use (optional) formatted as "MMMM-DD"
 * @returns The start and end date of the season or null if no matching season is found.
 */
export const getSeasonBounds = (
  date: Date,
  seasonBounds?: SeasonBoundsConfig[],
): SeasonBounds | null => {
  if (seasonBounds) {
    const foundSeason = seasonBounds.find(season => {
      const { start, end } = constructDateFromSeason(date, season);
      return date >= start && date <= end;
    });
    if (foundSeason) {
      return constructDateFromSeason(date, foundSeason);
    }
    return null;
  }
  const monthIndex = date.getMonth();
  const foundSeason = SEASON_MAP.find(
    season => season[0] <= monthIndex && monthIndex <= season[1],
  ) as [number, number];
  return {
    start: new Date(date.getFullYear(), foundSeason[0], 1),
    end: new Date(date.getFullYear(), foundSeason[1] + 1, 1),
  };
};

/**
 * Return the closest date from a given list of available dates
 * @param date
 * @param availableDates
 * @return date as milliseconds
 */
export function findClosestDate(
  date: number,
  availableDates: ReturnType<Date['getTime']>[],
) {
  // TODO - better handle empty arrays.
  if (availableDates.length === 0) {
    return date;
  }

  const reducerFunc = (
    closest: ReturnType<Date['getTime']>,
    current: ReturnType<Date['getTime']>,
  ) => {
    const diff = Math.abs(current - date);
    const closestDiff = Math.abs(closest - date);

    if (diff < closestDiff) {
      return current;
    }

    return closest;
  };

  return availableDates.reduce(reducerFunc);
}
