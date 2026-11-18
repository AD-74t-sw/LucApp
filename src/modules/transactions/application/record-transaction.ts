import { resolveClassification } from "@/modules/categories";
import { type Result, notFound, ok } from "@/shared/domain";
import type { Db } from "@/shared/infrastructure";
import {
  type Transaction,
  ensureDeletable,
  ensureEditable,
  signedAmount,
} from "../domain/transaction";
import {
  type NewTransaction,
  transactionRepository,
} from "../infrastructure/transaction-repository";
import {
  loadActiveAccount,
  loadCardForAccount,
  loadCategoryOfKind,
  parsePositiveAmount,
  resolveCurrency,
} from "./context";
import type { ExpenseInput, IncomeInput, UpdateTransactionInput } from "./transaction-schemas";

/** Validates an expense/income form and builds the row to store. */
async function buildMovement(
  userId: string,
  kind: "EXPENSE" | "INCOME",
  input: ExpenseInput | IncomeInput,
): Promise<Result<NewTransaction>> {
  const account = await loadActiveAccount(userId, input.accountId);
  if (!account.ok) return account;
  const card =
    kind === "EXPENSE" && "cardId" in input
      ? await loadCardForAccount(userId, input.cardId, account.value)
      : ok(null);
  if (!card.ok) return card;
  const category = await loadCategoryOfKind(userId, input.categoryId, kind);
  if (!category.ok) return category;
  const currency = resolveCurrency(account.value, input.currency);
  if (!currency.ok) return currency;
  const amount = parsePositiveAmount(input.amount, currency.value);
  if (!amount.ok) return amount;

  const classification =
    kind === "EXPENSE"
      ? resolveClassification(category.value.category, category.value.parent, {
          costType: "costType" in input ? input.costType : undefined,
          necessity: "necessity" in input ? input.necessity : undefined,
        })
      : { costType: null, necessity: null };

  return ok({
    accountId: account.value.id,
    cardId: card.value?.id ?? null,
    kind,
    amount: signedAmount(kind, amount.value),
    currency: currency.value,
    date: input.date,
    description: input.description,
    note: input.note ?? null,
    categoryId: category.value.category.id,
    ...classification,
  });
}

/** `db` lets another module record it inside its own database transaction. */
export async function recordExpense(
  userId: string,
  input: ExpenseInput,
  db?: Db,
): Promise<Result<Transaction>> {
  const movement = await buildMovement(userId, "EXPENSE", input);
  if (!movement.ok) return movement;
  return ok(await transactionRepository.create(userId, movement.value, db));
}

export async function recordIncome(
  userId: string,
  input: IncomeInput,
  db?: Db,
): Promise<Result<Transaction>> {
  const movement = await buildMovement(userId, "INCOME", input);
  if (!movement.ok) return movement;
  return ok(await transactionRepository.create(userId, movement.value, db));
}

export async function updateTransaction(
  userId: string,
  id: string,
  input: UpdateTransactionInput,
): Promise<Result<void>> {
  const current = await transactionRepository.findById(userId, id);
  if (!current) return notFound("El movimiento");
  const editable = ensureEditable(current);
  if (!editable.ok) return editable;
  const kind = current.kind === "INCOME" ? "INCOME" : "EXPENSE";
  const movement = await buildMovement(userId, kind, input);
  if (!movement.ok) return movement;
  await transactionRepository.update(userId, id, movement.value);
  return ok();
}

/** Deleting one leg of a transfer deletes both legs. */
export async function deleteTransaction(userId: string, id: string): Promise<Result<void>> {
  const current = await transactionRepository.findById(userId, id);
  if (!current) return notFound("El movimiento");
  const deletable = ensureDeletable(current);
  if (!deletable.ok) return deletable;
  if (current.transferGroupId) {
    await transactionRepository.deleteTransferGroup(userId, current.transferGroupId);
  } else {
    await transactionRepository.delete(userId, id);
  }
  return ok();
}
