/**
 * Time of day without a date, as "HH:MM" (24 h) in the user's time zone.
 * Like LocalDate, a string compares correctly ("09:30" < "13:00").
 */

export type LocalTime = string & { readonly __brand: "LocalTime" };

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isLocalTime(value: string): value is LocalTime {
  return TIME_RE.test(value);
}

/** Current time of day in the given IANA time zone. */
export function timeIn(timeZone: string, now: Date = new Date()): LocalTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}` as LocalTime;
}

/** Minutes since midnight. */
export function minutesOf(time: LocalTime): number {
  const [hours, minutes] = time.split(":").map(Number) as [number, number];
  return hours * 60 + minutes;
}
