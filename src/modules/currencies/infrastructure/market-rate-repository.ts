import { Prisma } from "@/generated/prisma/client";
import { type LocalDate, toCurrencyCode } from "@/shared/domain";
import { prisma, toDbDate, toLocalDate } from "@/shared/infrastructure";
import type { ExchangeRate } from "../domain/rate-table";

export const marketRateRepository = {
  async list(): Promise<ExchangeRate[]> {
    const rows = await prisma.marketRate.findMany({ orderBy: { date: "asc" } });
    return rows.map((row) => ({
      from: toCurrencyCode(row.fromCurrency),
      to: toCurrencyCode(row.toCurrency),
      date: toLocalDate(row.date),
      rate: row.rate.toNumber(),
    }));
  },

  /** Most recent rate dated on or before `date` (the source publishes the next business day early). */
  async latestOnOrBefore(date: LocalDate): Promise<(ExchangeRate & { updatedAt: Date }) | null> {
    const row = await prisma.marketRate.findFirst({
      where: { date: { lte: toDbDate(date) } },
      orderBy: { date: "desc" },
    });
    if (!row) return null;
    return {
      from: toCurrencyCode(row.fromCurrency),
      to: toCurrencyCode(row.toCurrency),
      date: toLocalDate(row.date),
      rate: row.rate.toNumber(),
      updatedAt: row.updatedAt,
    };
  },

  /** When rates were last fetched (any row), to decide whether to refresh. */
  async lastFetchedAt(): Promise<Date | null> {
    const row = await prisma.marketRate.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    return row?.updatedAt ?? null;
  },

  async earliestDate(): Promise<LocalDate | null> {
    const row = await prisma.marketRate.findFirst({
      orderBy: { date: "asc" },
      select: { date: true },
    });
    return row ? toLocalDate(row.date) : null;
  },

  /** Inserts new rates and refreshes existing ones (published values can be corrected). */
  async upsertMany(rates: readonly ExchangeRate[], source: string): Promise<void> {
    for (const rate of rates) {
      const key = { fromCurrency: rate.from, toCurrency: rate.to, date: toDbDate(rate.date) };
      const value = new Prisma.Decimal(rate.rate);
      await prisma.marketRate.upsert({
        where: { fromCurrency_toCurrency_date: key },
        create: { ...key, rate: value, source },
        update: { rate: value, source },
      });
    }
  },
};
