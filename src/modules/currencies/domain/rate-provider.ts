import type { ExchangeRate } from "./rate-table";

/**
 * Port for a source of market exchange rates. The app ships with the Chilean
 * "dólar observado" (see infrastructure/mindicador.ts); tests plug a fixed one.
 */
export type RateProvider = Readonly<{
  /** Short name stored with each rate, e.g. "mindicador". */
  source: string;
  /** Most recent published rates (at least the latest one). */
  latest(): Promise<ExchangeRate[]>;
  /** Every published rate of a calendar year. */
  year(year: number): Promise<ExchangeRate[]>;
}>;
