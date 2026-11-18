import { randomUUID } from "node:crypto";
import { parseRate } from "@/modules/currencies";
import { type Result, ok, withField } from "@/shared/domain";
import { type Db, runInTransaction } from "@/shared/infrastructure";
import { planTransfer, resolveTransferAmounts } from "../domain/transfer";
import { transactionRepository } from "../infrastructure/transaction-repository";
import { loadActiveAccount, parsePositiveAmount, resolveCurrency } from "./context";
import type { TransferInput } from "./transaction-schemas";

/**
 * Moves money between two accounts of the user. Paying a credit card is a
 * transfer into the card; for its international debt the destination currency
 * differs, and the conversion comes from what was paid or the bank's rate.
 */
export async function recordTransfer(
  userId: string,
  input: TransferInput,
  /** An open database transaction to write in (both legs are always written together). */
  db?: Db,
): Promise<Result<{ transferGroupId: string }>> {
  const from = await loadActiveAccount(userId, input.fromAccountId, "fromAccountId");
  if (!from.ok) return from;
  const to = await loadActiveAccount(userId, input.toAccountId, "toAccountId");
  if (!to.ok) return to;
  const toCurrency = withField(resolveCurrency(to.value, input.toCurrency), "toCurrency");
  if (!toCurrency.ok) return toCurrency;

  let sent: number | null = null;
  if (input.amount) {
    const parsed = parsePositiveAmount(input.amount, from.value.currency, "amount");
    if (!parsed.ok) return parsed;
    sent = parsed.value;
  }
  let received: number | null = null;
  if (input.toAmount) {
    const parsed = parsePositiveAmount(input.toAmount, toCurrency.value, "toAmount");
    if (!parsed.ok) return parsed;
    received = parsed.value;
  }
  let clpPerUsd: number | null = null;
  if (input.rate) {
    const parsed = parseRate(input.rate);
    if (!parsed.ok) return parsed;
    clpPerUsd = parsed.value;
  }

  const amounts = resolveTransferAmounts({
    fromCurrency: from.value.currency,
    toCurrency: toCurrency.value,
    sent,
    received,
    clpPerUsd,
  });
  if (!amounts.ok) return amounts;
  const legs = planTransfer(from.value, to.value, toCurrency.value, amounts.value);
  if (!legs.ok) return legs;

  const transferGroupId = randomUUID();
  const description = input.description ?? `Transferencia ${from.value.name} → ${to.value.name}`;
  const common = {
    kind: "TRANSFER" as const,
    cardId: null,
    date: input.date,
    description,
    transferGroupId,
  };

  const write = (tx: Db) =>
    transactionRepository.createMany(
      userId,
      [
        {
          ...common,
          accountId: from.value.id,
          currency: legs.value.fromCurrency,
          amount: legs.value.fromAmount,
        },
        {
          ...common,
          accountId: to.value.id,
          currency: legs.value.toCurrency,
          amount: legs.value.toAmount,
        },
      ],
      tx,
    );
  await (db ? write(db) : runInTransaction(write));
  return ok({ transferGroupId });
}
