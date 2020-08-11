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
