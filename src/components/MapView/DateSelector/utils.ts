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

export function findAvailableDayInMonth(date: Date, availableDates: Date[]) {
  return availableDates.find(dateIt => moment(dateIt).isSame(date, 'month'));
}
