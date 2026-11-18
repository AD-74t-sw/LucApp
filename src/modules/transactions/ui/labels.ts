import type { TransactionKind } from "../domain/transaction";

export const TRANSACTION_KIND_LABELS: Record<TransactionKind, string> = {
  EXPENSE: "Gasto",
  INCOME: "Ingreso",
  TRANSFER: "Transferencia",
  DEBT: "Deuda",
};
