import { setRateProvider } from "@/modules/currencies";
import type { LocalDate } from "@/shared/domain";

/**
 * Tests never call the real "dólar observado" API: rates come from a fixed
 * provider (1 USD = 950 CLP every day).
 */
export const TEST_CLP_PER_USD = 950;

setRateProvider({
  source: "test",
  latest: async () => [
    {
      from: "USD",
      to: "CLP",
      date: new Date().toISOString().slice(0, 10) as LocalDate,
      rate: TEST_CLP_PER_USD,
    },
  ],
  year: async (year) => [
    { from: "USD", to: "CLP", date: `${year}-01-01` as LocalDate, rate: TEST_CLP_PER_USD },
  ],
});
