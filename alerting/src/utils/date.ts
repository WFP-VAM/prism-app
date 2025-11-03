/**
 * Formats a date into various formats.
 *
 * @param {string | Date} date - The date to format (can be a string or Date object).
 * @param {string} format - The desired format (e.g., 'YYYY-MM-DD', 'DD/MM/YYYY', 'YYYY-MM-DD HH:mm:ss').
 * @returns {string} - The formatted date string.
 */
export function formatDate(date: string | Date, format: string): string {
  const dateObj = new Date(date);

  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date format');
  }

  const day = dateObj.getUTCDate().toString().padStart(2, '0');
  const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getUTCFullYear();
  const hours = dateObj.getUTCHours().toString().padStart(2, '0');
  const minutes = dateObj.getUTCMinutes().toString().padStart(2, '0');
  const seconds = dateObj.getUTCSeconds().toString().padStart(2, '0');

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD-Month-YYYY':
      return `${day}-${monthNames[dateObj.getUTCMonth()]}-${year}`;
    case 'YYYY-MM-DD HH:mm':
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    case 'YYYY-MM-DD HH:mm:ss':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case 'DD/MM/YYYY HH:mm UTC':
      return `${day}/${month}/${year} ${hours}:${minutes} UTC`;
    default:
      throw new Error('Unsupported date format');
  }
}
