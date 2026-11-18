import { type LocalDate, today } from "@/shared/domain";
import type { RateProvider } from "../domain/rate-provider";
import type { ExchangeRate } from "../domain/rate-table";

/**
 * Chile's "dólar observado" published by the Central Bank, served by
 * mindicador.cl (free, no key). One value per business day.
 */
const BASE_URL = "https://mindicador.cl/api/dolar";
const TIMEOUT_MS = 6000;

type Response = { serie?: { fecha: string; valor: number }[] };

/** `fecha` is midnight in Chile expressed in UTC (e.g. 2026-11-13T03:00:00Z). */
function toChileDate(iso: string): LocalDate {
  return today("America/Santiago", new Date(iso));
}

async function fetchSeries(url: string): Promise<ExchangeRate[]> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`mindicador.cl responded ${response.status}`);
  const body = (await response.json()) as Response;
  return (body.serie ?? [])
    .filter((point) => Number.isFinite(point.valor) && point.valor > 0)
    .map((point) => ({
      from: "USD" as const,
      to: "CLP" as const,
      date: toChileDate(point.fecha),
      rate: point.valor,
    }));
}

export const mindicadorProvider: RateProvider = {
  source: "mindicador",
  latest: () => fetchSeries(BASE_URL),
  year: (year) => fetchSeries(`${BASE_URL}/${year}`),
};
