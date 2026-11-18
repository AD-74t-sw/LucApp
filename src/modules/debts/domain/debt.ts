import type { CostType, Necessity } from "@/modules/categories";
import {
  type CurrencyCode,
  type LocalDate,
  type Result,
  ok,
  validationError,
} from "@/shared/domain";

export const DEBT_DIRECTIONS = ["I_OWE", "THEY_OWE"] as const;
/** I_OWE: I owe the person. THEY_OWE: the person owes me. */
export type DebtDirection = (typeof DEBT_DIRECTIONS)[number];

export type DebtPayment = Readonly<{
  id: string;
  debtId: string;
  amount: number;
  date: LocalDate;
  note: string | null;
  transactionId: string | null;
}>;

export type Debt = Readonly<{
  id: string;
  personId: string;
  direction: DebtDirection;
  /** Original positive amount. */
  principal: number;
  currency: CurrencyCode;
  date: LocalDate;
  dueDate: LocalDate | null;
  description: string;
  /** Expense category (null only for debts created before categories were required). */
  categoryId: string | null;
  costType: CostType | null;
  necessity: Necessity | null;
  settled: boolean;
  transactionId: string | null;
  payments: readonly DebtPayment[];
}>;

/**
 * A debt is never spending by itself: it is shown as pending (what I owe and
 * what I am owed). What I pay on a debt I owe is spending, in the debt's
 * category, in the month I pay it.
 *
 * Exception: a cash loan registered on an account (money entered my account).
 * What I buy with that money is already recorded as its own expense, so
 * counting its payments too would count the same money twice.
 * Payments I receive on money I lent are not income: it is my money coming back.
 */
export function paymentsCountAsSpending(debt: Pick<Debt, "direction" | "transactionId">): boolean {
  return debt.direction === "I_OWE" && debt.transactionId === null;
}

export type Person = Readonly<{ id: string; name: string; note: string | null }>;

export function paidAmount(debt: Pick<Debt, "payments">): number {
  return debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
}

export function outstanding(debt: Pick<Debt, "principal" | "payments">): number {
  return debt.principal - paidAmount(debt);
}

export function isOverdue(debt: Pick<Debt, "dueDate" | "settled">, today: LocalDate): boolean {
  return !debt.settled && debt.dueDate !== null && debt.dueDate < today;
}

export function validatePayment(
  debt: Pick<Debt, "principal" | "payments">,
  amount: number,
): Result<void> {
  if (amount <= 0) return validationError("El abono debe ser mayor que cero.", "amount");
  if (amount > outstanding(debt)) {
    return validationError("El abono no puede superar lo que queda por pagar.", "amount");
  }
  return ok();
}

/** The original amount can change, but never below what was already paid. */
export function validatePrincipal(principal: number, paid: number): Result<void> {
  if (principal <= 0) return validationError("El monto debe ser mayor que cero.", "amount");
  if (principal < paid) {
    return validationError("El monto no puede ser menor que lo ya abonado.", "amount");
  }
  return ok();
}

/** Editing a payment: the other payments plus the new amount cannot exceed the debt. */
export function validatePaymentChange(
  debt: Pick<Debt, "principal" | "payments">,
  paymentId: string,
  amount: number,
): Result<void> {
  if (amount <= 0) return validationError("El abono debe ser mayor que cero.", "amount");
  const others = debt.payments
    .filter((p) => p.id !== paymentId)
    .reduce((sum, p) => sum + p.amount, 0);
  if (others + amount > debt.principal) {
    return validationError("Los abonos no pueden superar el monto de la deuda.", "amount");
  }
  return ok();
}

/**
 * Signed amount for the optional account movement:
 * - borrowing (I_OWE) brings money in, repaying it takes money out;
 * - lending (THEY_OWE) takes money out, being repaid brings it in.
 */
export function accountMovementAmount(
  direction: DebtDirection,
  event: "open" | "payment",
  amount: number,
): number {
  const inflow = (direction === "I_OWE") === (event === "open");
  return inflow ? amount : -amount;
}

export type CurrencyBalance = Readonly<{
  currency: CurrencyCode;
  /** What the person still owes me. */
  owedToMe: number;
  /** What I still owe the person. */
  iOwe: number;
  /** Positive: they owe me overall. Negative: I owe them overall. */
  net: number;
}>;

/** Outstanding amounts grouped per currency (amounts in different currencies are never added). */
export function balancesByCurrency(debts: readonly Debt[]): CurrencyBalance[] {
  const totals = new Map<CurrencyCode, { owedToMe: number; iOwe: number }>();
  for (const debt of debts) {
    const pending = outstanding(debt);
    if (pending === 0) continue;
    const entry = totals.get(debt.currency) ?? { owedToMe: 0, iOwe: 0 };
    if (debt.direction === "THEY_OWE") entry.owedToMe += pending;
    else entry.iOwe += pending;
    totals.set(debt.currency, entry);
  }
  return [...totals.entries()].map(([currency, t]) => ({
    currency,
    owedToMe: t.owedToMe,
    iOwe: t.iOwe,
    net: t.owedToMe - t.iOwe,
  }));
}
