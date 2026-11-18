// Public server API of the debts module.
export {
  DEBT_DIRECTIONS,
  paymentsCountAsSpending,
  type CurrencyBalance,
  type Debt,
  type DebtDirection,
  type Person,
} from "./domain/debt";
export {
  getDebt,
  getDebtTotals,
  getPersonWithDebts,
  listPeople,
  listPeopleWithBalances,
  type PersonSummary,
} from "./application/debt-queries";
export type { DebtListItem } from "./infrastructure/debt-repository";
