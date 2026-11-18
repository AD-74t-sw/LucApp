import { type LocalDate, type Result, ok, validationError } from "@/shared/domain";
import type { Db } from "@/shared/infrastructure";
import { transactionRepository } from "../infrastructure/transaction-repository";
import { loadActiveAccount } from "./context";

/**
 * API used by the debts module: lending, borrowing and repaying move real money
 * on an account but are not income or expense, so they are stored as DEBT.
 */
export async function recordDebtMovement(
  userId: string,
  input: { accountId: string; amount: number; date: LocalDate; description: string },
  db?: Db,
): Promise<Result<{ transactionId: string }>> {
  const account = await loadActiveAccount(userId, input.accountId, "accountId", db);
  if (!account.ok) return account;
  if (input.amount === 0) return validationError("El monto no puede ser cero.", "amount");
  const transaction = await transactionRepository.create(
    userId,
    {
      accountId: account.value.id,
      cardId: null,
      kind: "DEBT",
      amount: input.amount,
      currency: account.value.currency,
      date: input.date,
      description: input.description,
    },
    db,
  );
  return ok({ transactionId: transaction.id });
}

/** Keeps an account movement in sync when its debt or payment is edited. */
export async function updateDebtMovement(
  userId: string,
  transactionId: string,
  input: { amount: number; date: LocalDate; description: string },
  db?: Db,
): Promise<Result<void>> {
  if (input.amount === 0) return validationError("El monto no puede ser cero.", "amount");
  await transactionRepository.updateDebtMovement(userId, transactionId, input, db);
  return ok();
}

export async function deleteDebtMovement(
  userId: string,
  transactionId: string,
  db?: Db,
): Promise<void> {
  await transactionRepository.delete(userId, transactionId, db);
}
