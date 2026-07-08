export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** ISO 8601 week number (KW). */
export function isoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const WEEKDAYS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function weekdayShort(index: number): string {
  return WEEKDAYS_SHORT[index] ?? "";
}

/** "30.6." style short date for grid headers. */
export function formatShortDate(date: Date): string {
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}

/** "30. Juni – 6. Juli" for the page heading. */
export function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
  return `${monday.toLocaleDateString("de-DE", options)} – ${sunday.toLocaleDateString("de-DE", options)}`;
}
