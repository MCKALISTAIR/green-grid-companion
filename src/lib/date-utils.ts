import { format, isToday, isTomorrow } from 'date-fns';

/**
 * Returns a human-readable day label for a given date
 * @param date - The date to get a label for
 * @returns Empty string for today, "tomorrow" for tomorrow, or the full day name (e.g., "Monday")
 */
export function getDayLabel(date: Date): string {
  if (isToday(date)) return '';
  if (isTomorrow(date)) return 'tomorrow';
  return format(date, 'EEEE');
}

/**
 * Calculates the UK timezone offset (0 for GMT, 1 for BST)
 * BST runs from the last Sunday in March at 1:00 UTC to the last Sunday in October at 1:00 UTC
 * @param date - The date to check
 * @returns 0 for GMT, 1 for BST
 */
export function getUKOffset(date: Date): number {
  const year = date.getUTCFullYear();

  // Last Sunday in March at 1:00 UTC
  const marchLastSunday = new Date(Date.UTC(year, 2, 31, 1, 0, 0));
  marchLastSunday.setUTCDate(31 - marchLastSunday.getUTCDay());

  // Last Sunday in October at 1:00 UTC
  const octoberLastSunday = new Date(Date.UTC(year, 9, 31, 1, 0, 0));
  octoberLastSunday.setUTCDate(31 - octoberLastSunday.getUTCDay());

  return date >= marchLastSunday && date < octoberLastSunday ? 1 : 0;
}
