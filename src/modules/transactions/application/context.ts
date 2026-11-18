import { type Account, type Card, getAccount, getCard, supportsCurrency } from "@/modules/accounts";
import { type Category, type CategoryKind, getCategoryWithParent } from "@/modules/categories";
import {
  type CurrencyCode,
  type Result,
  notFound,
  ok,
  parseAmount,
  validationError,
  withField,
} from "@/shared/domain";
import type { Db } from "@/shared/infrastructure";
import { requirePositive } from "../domain/transaction";

/**
 * Loads and checks the entities a movement points to. Every lookup is scoped to
 * the user, so ids coming from a form can never reach someone else's data.
 */

export async function loadActiveAccount(
  userId: string,
  accountId: string,
  field = "accountId",
  db?: Db,
): Promise<Result<Account>> {
  const account = await getAccount(userId, accountId, db);
  if (!account) return withField(notFound("La cuenta"), field);
  if (account.archived) return validationError("La cuenta está archivada.", field);
  return ok(account);
}

export async function loadCardForAccount(
  userId: string,
  cardId: string | undefined,
  account: Account,
): Promise<Result<Card | null>> {
  if (!cardId) return ok(null);
  const card = await getCard(userId, cardId);
  if (!card) return notFound("La tarjeta");
  if (card.accountId !== account.id) {
    return validationError("La tarjeta no pertenece a la cuenta elegida.", "cardId");
  }
  if (card.archived) return validationError("La tarjeta está archivada.", "cardId");
  return ok(card);
}

export async function loadCategoryOfKind(
  userId: string,
  categoryId: string,
  kind: CategoryKind,
): Promise<Result<{ category: Category; parent: Category | null }>> {
  const found = await getCategoryWithParent(userId, categoryId);
  if (!found) return validationError("La categoría no existe.", "categoryId");
  if (found.category.kind !== kind) {
    return validationError(
      kind === "EXPENSE" ? "Elige una categoría de gasto." : "Elige una categoría de ingreso.",
      "categoryId",
    );
  }
  if (found.category.archived) return validationError("La categoría está archivada.", "categoryId");
  return ok(found);
}

/** Parses a typed amount in the account currency and requires it to be positive. */
export function parsePositiveAmount(
  input: string,
  currency: CurrencyCode,
  field = "amount",
): Result<number> {
  const parsed = withField(parseAmount(input, currency), field);
  if (!parsed.ok) return parsed;
  return requirePositive(parsed.value, field);
}

/** Currency of a movement: the account's, or its international one on a dual-currency card. */
export function resolveCurrency(
  account: Account,
  requested: CurrencyCode | undefined,
): Result<CurrencyCode> {
  const currency = requested ?? account.currency;
  if (!supportsCurrency(account, currency)) {
    return validationError(`La cuenta ${account.name} no opera en ${currency}.`, "currency");
  }
  return ok(currency);
}
