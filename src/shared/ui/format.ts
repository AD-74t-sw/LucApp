import { type CurrencyCode, type LocalDate, type MonthKey, fractionDigits } from "@/shared/domain";

export const LOCALE = "es-CL";

export function formatMoney(
  minor: number,
  currency: CurrencyCode,
  options: { signDisplay?: "auto" | "always" | "exceptZero" | "never"; compact?: boolean } = {},
): string {
  const digits = fractionDigits(currency);
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: options.compact ? 0 : digits,
    maximumFractionDigits: options.compact ? 1 : digits,
    notation: options.compact ? "compact" : "standard",
    signDisplay: options.signDisplay ?? "auto",
  }).format((minor || 0) / 10 ** digits); // `|| 0` turns -0 into 0
}

/** "USD 1.234,50" style label that keeps the currency explicit when mixing currencies. */
export function formatMoneyWithCode(minor: number, currency: CurrencyCode): string {
  return `${currency} ${formatMoney(minor, currency)}`;
}

export function formatDate(date: LocalDate): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatMonth(month: MonthKey): string {
  const label = new Intl.DateTimeFormat(LOCALE, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatMonthShort(month: MonthKey): string {
  return new Intl.DateTimeFormat(LOCALE, { month: "short", year: "2-digit", timeZone: "UTC" })
    .format(new Date(`${month}-01T00:00:00Z`))
    .replace(".", "");
}

export function formatPercent(ratio: number): string {
  return new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 0 }).format(
    ratio,
  );
}
