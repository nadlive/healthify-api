const { formatInTimeZone } = require('date-fns-tz');

/**
 * Formats a UTC date to a simple date-time string in the specified timezone
 * @param {Date|string} date - The UTC date to format (Date object or ISO string)
 * @param {string} timezone - IANA timezone string (e.g., 'Asia/Colombo', 'America/New_York')
 * @returns {string} Formatted date string in 'yyyy-MM-dd HH:mm:ss' format
 */
const formatDateToTimezone = (
  date,
  timezone,
  format = 'yyyy-MM-dd HH:mm:ss',
) => {
  if (!date) return date;
  const dateObj = date instanceof Date ? date : new Date(date);
  return formatInTimeZone(dateObj, String(timezone || 'UTC'), format);
};

module.exports = {
  formatDateToTimezone,
};
