/**
 * Calendar dates without time of day, represented as "YYYY-MM-DD" strings.
 * Using strings avoids time-zone shifts when a date travels between server,
 * database and browser. Months are "YYYY-MM".
 */

export type LocalDate = string & { readonly __brand: "LocalDate" };
export type MonthKey = string & { readonly __brand: "MonthKey" };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;

export function isLocalDate(value: string): value is LocalDate {
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export function isMonthKey(value: string): value is MonthKey {
  const match = MONTH_RE.exec(value);
  return match !== null && Number(match[2]) >= 1 && Number(match[2]) <= 12;
}

export function localDate(year: number, month: number, day: number): LocalDate {
  const value = `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
  if (!isLocalDate(value)) throw new RangeError(`Invalid date ${value}`);
  return value;
}

export function parts(date: LocalDate): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return { year, month, day };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Today's date in the given IANA time zone. */
export function today(timeZone: string, now: Date = new Date()): LocalDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now) as LocalDate;
}

/** Adds months keeping the day when possible and clamping to the month's last day (Jan 31 + 1 = Feb 28). */
export function addMonths(date: LocalDate, months: number): LocalDate {
  const { year, month, day } = parts(date);
  const index = year * 12 + (month - 1) + months;
  const newYear = Math.floor(index / 12);
  const newMonth = (index % 12) + 1;
  return localDate(newYear, newMonth, Math.min(day, daysInMonth(newYear, newMonth)));
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const { year, month, day } = parts(date);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10) as LocalDate;
}

export function monthOf(date: LocalDate): MonthKey {
  return date.slice(0, 7) as MonthKey;
}

export function addMonthsToKey(month: MonthKey, months: number): MonthKey {
  return monthOf(addMonths(`${month}-01` as LocalDate, months));
}

export function firstDayOfMonth(month: MonthKey): LocalDate {
  return `${month}-01` as LocalDate;
}

export function lastDayOfMonth(month: MonthKey): LocalDate {
  const [year, m] = month.split("-").map(Number) as [number, number];
  return localDate(year, m, daysInMonth(year, m));
}

/** `count` consecutive months ending at `last` (inclusive), oldest first. */
export function monthsEndingAt(last: MonthKey, count: number): MonthKey[] {
  return Array.from({ length: count }, (_, index) => addMonthsToKey(last, index - count + 1));
}

export function minDate(a: LocalDate, b: LocalDate): LocalDate {
  return a <= b ? a : b;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
