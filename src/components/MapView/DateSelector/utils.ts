import moment from 'moment';
import { AvailableDates } from '../../../config/types';

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
 * @param availableDates
 * @return a list of available dates the month
 */
export function findAvailableDayInMonth(
  month: number,
  year: number,
  availableDates: AvailableDates,
) {
  const date = new Date(year, month);
  const filterDates = (dates: number[]) =>
    dates.filter(dateIt => moment(dateIt).isSame(date, 'month'));
  return availableDates
    .map(filterDates)
    .filter(layerDates => layerDates.length);
}

/**
 * Return true if there is an available date in the month
 * @param month
 * @param year
 * @param availableDates
 * @return
 */
export function isAvailableMonth(
  month: number,
  year: number,
  availableDates: AvailableDates,
) {
  return !findAvailableDayInMonth(month, year, availableDates).isEmpty();
}
