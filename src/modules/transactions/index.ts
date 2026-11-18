// Public server API of the transactions module.
export type { AccountBalance } from "./domain/balance";
export { TRANSACTION_KINDS, type Transaction, type TransactionKind } from "./domain/transaction";
export { buildInstallmentSchedule } from "./domain/installment-schedule";
export {
  transactionFiltersSchema,
  type TransactionFiltersInput,
} from "./application/transaction-schemas";
export {
  findSimilarTransactions,
  getAccountBalances,
  getTransaction,
  listInstallmentPlans,
  listTransactions,
  type InstallmentPlanSummary,
} from "./application/transaction-queries";
export {
  deleteDebtMovement,
  recordDebtMovement,
  updateDebtMovement,
} from "./application/debt-movements";
export { deleteLinkedMovement } from "./application/linked-movements";
export type { TransactionListItem } from "./infrastructure/transaction-repository";
export { recordExpense, recordIncome } from "./application/record-transaction";
export { recordTransfer } from "./application/record-transfer";
export {
  expenseSchema,
  incomeSchema,
  transferSchema,
  type ExpenseInput,
  type IncomeInput,
  type TransferInput,
} from "./application/transaction-schemas";
