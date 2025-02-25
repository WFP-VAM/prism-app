/**
 * Converts an ISO date string to a formatted string with date and time in UTC.
 *
 * @param {string} isoDate - The ISO date string (e.g., "2024-03-12T14:00:00Z").
 * @returns {string} - The formatted date string in UTC (e.g., "12/03/2024 14:00 UTC", format: DD/MM/YYYY).
 */
export function formatDateToUTC(isoDate: string): string {
  const date = new Date(isoDate);

  const day = date.getUTCDate().toString().padStart(2, '0');
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes} UTC`;
}
