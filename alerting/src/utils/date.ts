/**
 * Converts an ISO date string to a formatted string with weekday, date, and time in UTC.
 *
 * @param {string} isoDate - The ISO date string (e.g., "2024-12-12T00:00:00Z").
 * @returns {string} - The formatted date string (e.g., "Tuesday 12/03/2024 14:00 UTC").
 */
export function formatDateToUTC(isoDate: string): string {
  const dateObj = new Date(isoDate);

  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date format');
  }

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  };

  const formattedDate = new Intl.DateTimeFormat('en-US', options).format(
    dateObj,
  );

  const [weekday, dayMonthYear, time] = formattedDate.split(', ');
  return `${weekday} ${dayMonthYear} ${time} UTC`;
}
