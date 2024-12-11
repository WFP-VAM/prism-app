import {
  isSameDay,
  parseJSON,
  format,
  addHours,
  differenceInHours,
} from 'date-fns';

export function getDateInUTC(time: string, hasHours: boolean = true) {
  try {
    return parseJSON(time + (!hasHours ? ' 00:00:00' : ''));
  } catch {
    return null;
  }
}

export function isDateSameAsCurrentDate(date: string, currentDate: string) {
  const parsedDate = getDateInUTC(date, true);
  if (!parsedDate) {
    return false;
  }

  const parsedCurrentDate = getDateInUTC(currentDate, false);
  if (!parsedCurrentDate) {
    return false;
  }

  return isSameDay(parsedDate, parsedCurrentDate);
}

export function formatReportDate(date: string) {
  const parsedDate = getDateInUTC(date, true);
  if (!parsedDate) {
    return '';
  }

  return formatInUTC(parsedDate, 'yyy-MM-dd Kaaa');
}

export function formatInUTC(dateInUTC: Date, fmt: string) {
  const localTimeZone = new Date().getTimezoneOffset(); // tz in minutes positive or negative
  const hoursToAddOrRemove = Math.round(localTimeZone / 60);
  const shiftedDate = addHours(dateInUTC, hoursToAddOrRemove);

  return format(shiftedDate, fmt);
}

export function formatLandfallDate(dateRange: string[]) {
  const date = dateRange[0];
  const parsedDate = getDateInUTC(date, true);
  if (!parsedDate) {
    return '';
  }

  return formatInUTC(parsedDate, 'yyy-MM-dd HH:mm');
}

export function formatLandfallTimeRange(dateRange: string[]) {
  const fromDate = dateRange[0];
  const toDate = dateRange[1];

  const parsedFormDate = getDateInUTC(fromDate, true);
  const parsedToDate = getDateInUTC(toDate, true);
  if (!parsedFormDate || !parsedToDate) {
    return '';
  }

  return `+= ${differenceInHours(parsedToDate, parsedFormDate)} hours`;
}
