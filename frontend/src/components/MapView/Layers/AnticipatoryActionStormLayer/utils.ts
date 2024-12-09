import { isSameDay, parseJSON, format, addHours } from 'date-fns';

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
