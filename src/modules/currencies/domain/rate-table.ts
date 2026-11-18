import {
  type CurrencyCode,
  type LocalDate,
  type Result,
  convertAmount,
  ok,
  validationError,
} from "@/shared/domain";

/** 1 unit of `from` = `rate` units of `to`, valid from `date` on. */
export type ExchangeRate = Readonly<{
  from: CurrencyCode;
  to: CurrencyCode;
  date: LocalDate;
  rate: number;
}>;

export type RateTable = Readonly<{
  /** Rate to convert `from` into `to` on `date`, or null when no rate is known. */
  rateFor(from: CurrencyCode, to: CurrencyCode, date: LocalDate): number | null;
  /** Converts minor units, or returns null when no rate is known. */
  convert(amount: number, from: CurrencyCode, to: CurrencyCode, date: LocalDate): number | null;
}>;

/**
 * Picks, for a currency pair, the most recent rate on or before the date. If the
 * date is older than every stored rate, the oldest rate is used. Inverse pairs
 * are derived (USD→CLP 950 gives CLP→USD 1/950).
 */
export function createRateTable(rates: readonly ExchangeRate[]): RateTable {
  const byPair = new Map<string, { date: LocalDate; rate: number }[]>();
  const add = (from: CurrencyCode, to: CurrencyCode, date: LocalDate, rate: number) => {
    const key = `${from}>${to}`;
    byPair.set(key, [...(byPair.get(key) ?? []), { date, rate }]);
  };
  for (const r of rates) add(r.from, r.to, r.date, r.rate);
  for (const list of byPair.values()) list.sort((a, b) => a.date.localeCompare(b.date));

  const pick = (from: CurrencyCode, to: CurrencyCode, date: LocalDate): number | null => {
    const list = byPair.get(`${from}>${to}`);
    if (!list || list.length === 0) return null;
    let chosen = list[0]!;
    for (const entry of list) {
      if (entry.date <= date) chosen = entry;
      else break;
    }
    return chosen.rate;
  };

  const rateFor = (from: CurrencyCode, to: CurrencyCode, date: LocalDate): number | null => {
    if (from === to) return 1;
    const direct = pick(from, to, date);
    if (direct !== null) return direct;
    const inverse = pick(to, from, date);
    return inverse !== null ? 1 / inverse : null;
  };

  return {
    rateFor,
    convert(amount, from, to, date) {
      const rate = rateFor(from, to, date);
      return rate === null ? null : convertAmount(amount, from, to, rate);
    },
  };
}

/** Parses "950,25" or "950.25" into a positive number. */
export function parseRate(input: string): Result<number> {
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return validationError("Tasa inválida.", "rate");
  const value = Number(normalized);
  if (!(value > 0)) return validationError("La tasa debe ser mayor que cero.", "rate");
  return ok(value);
}
