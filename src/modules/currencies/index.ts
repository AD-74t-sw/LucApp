// Public server API of the currencies module.
export { createRateTable, parseRate, type ExchangeRate, type RateTable } from "./domain/rate-table";
export {
  getCurrentRate,
  getRateTable,
  setRateProvider,
  type CurrentRate,
} from "./application/market-rates";
export type { RateProvider } from "./domain/rate-provider";
