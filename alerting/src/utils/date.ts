import moment from 'moment';

/**
 * Converts an ISO date string to a formatted string with weekday, date, and time in UTC.
 *
 * @param {string} isoDate - The ISO date string (e.g., "2024-03-12T14:00:00Z").
 * @returns {string} - The formatted date string in UTC (e.g., "Tuesday 12/03/2024 14:00 UTC", format: DD/MM/YYYY).
 */
export function formatDateToUTC(isoDate: string): string {
  return moment(isoDate).utc().format('DD/MM/YYYY HH:mm [UTC]');
}