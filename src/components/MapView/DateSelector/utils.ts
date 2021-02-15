import moment from 'moment';

export const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sept',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Return the start and end date of a month (utc format)
 * @param month
 * @param year
 * @return { startDate, endDate }
 */
export function getMonthStartAndEnd(month: number, year: number) {
  const monthDate = moment({ year, month });

  const startDate = monthDate.startOf('month').valueOf();
  const endDate = monthDate.endOf('month').valueOf();

  return { startDate, endDate };
}

/**
 * Return the list of available dates the month
 * @param month
 * @param year
 * @param availableDates in millisecond format
 * @return a list of available dates the month
 */
export function findAvailableDayInMonth(
  month: number,
  year: number,
  availableDates: ReturnType<Date['getTime']>[],
) {
  const reference = new Date(year, month);
  return availableDates.filter(d => moment(d).isSame(reference, 'month'));
}

/**
 * Return true if there is an available date in the month
 * @param month
 * @param year
 * @param availableDates in millisecond format
 * @return
 */
export function isAvailableMonth(
  month: number,
  year: number,
  availableDates: ReturnType<Date['getTime']>[],
) {
  return findAvailableDayInMonth(month, year, availableDates).length > 0;
}

/**
 * Return index of available dates that matched
 * @param availableDates in millisecond format
 * @param date in millisecond format
 * @return
 */
export function findDateIndex(
  availableDates: ReturnType<Date['getTime']>[],
  date: number,
) {
  let startIndex = 0;
  let endIndex = availableDates.length - 1;
  while (startIndex <= endIndex) {
    const midIndex = Math.floor((startIndex + endIndex) / 2);
    if (availableDates[midIndex] === date) {
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
