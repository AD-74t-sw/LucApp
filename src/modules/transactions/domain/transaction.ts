import type { CostType, Necessity } from "@/modules/categories";
import {
  type CurrencyCode,
  type LocalDate,
  type Result,
  ok,
  validationError,
} from "@/shared/domain";

export const TRANSACTION_KINDS = ["EXPENSE", "INCOME", "TRANSFER", "DEBT"] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

/** A money movement on one account. `amount` is signed: negative = money leaves the account. */
export type Transaction = Readonly<{
  id: string;
  accountId: string;
  cardId: string | null;
  kind: TransactionKind;
  amount: number;
  currency: CurrencyCode;
  date: LocalDate;
  description: string;
  note: string | null;
  categoryId: string | null;
  costType: CostType | null;
  necessity: Necessity | null;
  transferGroupId: string | null;
  installmentPlanId: string | null;
  installmentNumber: number | null;
}>;

/** Expenses and incomes are typed as positive numbers; the sign comes from the kind. */
export function signedAmount(kind: "EXPENSE" | "INCOME", positive: number): number {
  return kind === "EXPENSE" ? -Math.abs(positive) : Math.abs(positive);
}

export function requirePositive(amount: number, field = "amount"): Result<number> {
  return amount > 0 ? ok(amount) : validationError("El monto debe ser mayor que cero.", field);
}

/**
 * Only plain expenses and incomes are edited from the movements screen. Transfers
 * are deleted and recreated, installments belong to their plan and debt
 * movements are managed from the debts screen.
 */
export function ensureEditable(transaction: Transaction): Result<void> {
  if (transaction.installmentPlanId) {
    return validationError(
      "Esta cuota pertenece a una compra en cuotas. Edita o elimina la compra completa.",
    );
  }
  if (transaction.kind === "TRANSFER") {
    return validationError("Las transferencias no se editan: elimínala y créala de nuevo.");
  }
  if (transaction.kind === "DEBT") {
    return validationError("Este movimiento pertenece a una deuda. Adminístralo desde Deudas.");
  }
  return ok();
}

export function ensureDeletable(transaction: Transaction): Result<void> {
  if (transaction.installmentPlanId) {
    return validationError(
      "Esta cuota pertenece a una compra en cuotas. Elimina la compra completa.",
    );
  }
  if (transaction.kind === "DEBT") {
    return validationError("Este movimiento pertenece a una deuda. Elimínalo desde Deudas.");
  }
  return ok();
}
