import { type LocalDate, parts, today } from "@/shared/domain";
import { type ExchangeRate, type RateTable, createRateTable } from "../domain/rate-table";
import { marketRateRepository } from "../infrastructure/market-rate-repository";
import { mindicadorProvider } from "../infrastructure/mindicador";
import type { RateProvider } from "../domain/rate-provider";

/**
 * Market rates are fetched from the provider and stored, so pages never wait on
 * the external API more than once every few hours, and keep working (with the
 * last known rate) if it is down.
 */
const REFRESH_AFTER_MS = 3 * 60 * 60 * 1000;
/** The "dólar observado" is a Chilean rate: "today" is today in Chile. */
const RATE_TIME_ZONE = "America/Santiago";
const CHECK_EVERY_MS = 10 * 60 * 1000;

let provider: RateProvider = mindicadorProvider;
let lastCheck = 0;
const loadedYears = new Set<number>();

/** Swaps the rate source (used by tests). */
export function setRateProvider(next: RateProvider): void {
  provider = next;
  lastCheck = 0;
  loadedYears.clear();
}

async function store(fetch: () => Promise<ExchangeRate[]>): Promise<void> {
  try {
    await marketRateRepository.upsertMany(await fetch(), provider.source);
  } catch (error) {
    console.warn("[currencies] could not fetch market rates:", error);
  }
}

async function ensureFresh(): Promise<void> {
  if (Date.now() - lastCheck < CHECK_EVERY_MS) return;
  lastCheck = Date.now();
  const fetchedAt = await marketRateRepository.lastFetchedAt();
  if (!fetchedAt || Date.now() - fetchedAt.getTime() > REFRESH_AFTER_MS) {
    await store(() => provider.latest());
  }
}

/** Makes sure rates exist back to `from` (e.g. for a 12-month trend). */
async function ensureHistory(from: LocalDate): Promise<void> {
  const earliest = await marketRateRepository.earliestDate();
  if (earliest && earliest <= from) return;
  const firstYear = parts(from).year;
  const lastYear = earliest ? parts(earliest).year : new Date().getUTCFullYear();
  for (let year = firstYear; year <= lastYear; year++) {
    if (loadedYears.has(year)) continue;
    loadedYears.add(year);
    await store(() => provider.year(year));
  }
}

/** Conversion table built from the stored market rates. */
export async function getRateTable(options: { from?: LocalDate } = {}): Promise<RateTable> {
  await ensureFresh();
  if (options.from) await ensureHistory(options.from);
  return createRateTable(await marketRateRepository.list());
}

export type CurrentRate = Readonly<{ rate: number; date: LocalDate; source: string }>;

/** Latest known USD→CLP rate (the "real rate of the moment"), or null if none was ever fetched. */
export async function getCurrentRate(): Promise<CurrentRate | null> {
  await ensureFresh();
  const latest = await marketRateRepository.latestOnOrBefore(today(RATE_TIME_ZONE));
  return latest ? { rate: latest.rate, date: latest.date, source: provider.source } : null;
}
