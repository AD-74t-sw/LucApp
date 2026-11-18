import {
  type CurrencyCode,
  type Result,
  conflict,
  notFound,
  ok,
  otherCurrency,
  parseAmount,
  validationError,
  withField,
} from "@/shared/domain";
import {
  type Account,
  type AccountType,
  DEFAULT_CASH_ACCOUNT_NAME,
  openingBalanceFromInput,
  validateAccountRules,
} from "../domain/account";
import type { Db } from "@/shared/infrastructure";
import { type AccountData, accountRepository } from "../infrastructure/account-repository";
import type { CreateAccountInput, UpdateAccountInput } from "./account-schemas";

/** Parses an optional typed amount in a currency into minor units (null when empty). */
function optionalMinor(
  value: string | undefined,
  currency: CurrencyCode,
  field: string,
): Result<number | null> {
  if (!value) return ok(null);
  return withField(parseAmount(value, currency), field);
}

function wantsInternational(input: UpdateAccountInput): boolean {
  return Boolean(input.international || input.secondaryCreditLimit);
}

/** Converts typed amounts into minor units and checks the account rules. */
function toAccountData(
  type: AccountType,
  currency: CurrencyCode,
  input: UpdateAccountInput,
): Result<AccountData> {
  // Typing a limit in the other currency is enough to enable the international quota.
  const secondaryCurrency = wantsInternational(input) ? otherCurrency(currency) : null;
  const opening = optionalMinor(input.openingBalance, currency, "openingBalance");
  if (!opening.ok) return opening;
  const creditLimit = optionalMinor(input.creditLimit, currency, "creditLimit");
  if (!creditLimit.ok) return creditLimit;
  const secondaryLimit = secondaryCurrency
    ? optionalMinor(input.secondaryCreditLimit, secondaryCurrency, "secondaryCreditLimit")
    : ok(null);
  if (!secondaryLimit.ok) return secondaryLimit;
  const secondaryOpening = secondaryCurrency
    ? optionalMinor(input.secondaryOpeningBalance, secondaryCurrency, "secondaryOpeningBalance")
    : ok(null);
  if (!secondaryOpening.ok) return secondaryOpening;

  const data: AccountData = {
    name: input.name,
    institution: input.institution ?? null,
    openingBalance: openingBalanceFromInput(type, opening.value ?? 0),
    creditLimit: creditLimit.value,
    secondaryCurrency,
    secondaryCreditLimit: secondaryLimit.value,
    secondaryOpeningBalance: openingBalanceFromInput(type, secondaryOpening.value ?? 0),
    closingDay: input.closingDay ?? null,
    dueDay: input.dueDay ?? null,
  };
  const valid = validateAccountRules({ type, currency, ...data });
  return valid.ok ? ok(data) : valid;
}

const duplicateName = () => conflict("Ya tienes una cuenta con ese nombre.", "name");

export async function createAccount(
  userId: string,
  input: CreateAccountInput,
): Promise<Result<Account>> {
  const data = toAccountData(input.type, input.currency, input);
  if (!data.ok) return data;
  const account = await accountRepository.create(userId, input.type, input.currency, data.value);
  return account ? ok(account) : duplicateName();
}

export async function updateAccount(
  userId: string,
  id: string,
  input: UpdateAccountInput,
): Promise<Result<Account>> {
  const current = await accountRepository.findById(userId, id);
  if (!current) return notFound("La cuenta");
  if (current.secondaryCurrency && !wantsInternational(input)) {
    // Its movements in that currency would be left without a place to live.
    return validationError(
      "El cupo internacional no se puede quitar una vez creado.",
      "secondaryCreditLimit",
    );
  }
  const data = toAccountData(current.type, current.currency, input);
  if (!data.ok) return data;
  const account = await accountRepository.update(userId, id, data.value);
  return account ? ok(account) : duplicateName();
}

/**
 * Every user keeps at least one active cash account: it is where money in hand
 * lives (ATM withdrawals, cash expenses), so it can never disappear.
 */
async function guardLastCashAccount(userId: string, account: Account): Promise<Result<void>> {
  if (account.type !== "CASH" || account.archived) return ok();
  const others = await accountRepository.countActive(userId, "CASH", { excludeId: account.id });
  return others > 0
    ? ok()
    : conflict(
        "Siempre debe existir una cuenta de efectivo. Puedes renombrarla, pero no quitarla.",
      );
}

export async function setAccountArchived(
  userId: string,
  id: string,
  archived: boolean,
): Promise<Result<void>> {
  const account = await accountRepository.findById(userId, id);
  if (!account) return notFound("La cuenta");
  if (archived) {
    const guard = await guardLastCashAccount(userId, account);
    if (!guard.ok) return guard;
  }
  await accountRepository.setArchived(userId, id, archived);
  return ok();
}

/** Creates the default cash account if the user has no active one (idempotent). */
export async function ensureCashAccount(
  userId: string,
  currency: CurrencyCode,
  db?: Db,
): Promise<void> {
  if ((await accountRepository.countActive(userId, "CASH", {}, db)) > 0) return;
  const name = (await accountRepository.nameExists(userId, DEFAULT_CASH_ACCOUNT_NAME, db))
    ? `${DEFAULT_CASH_ACCOUNT_NAME} (${currency})`
    : DEFAULT_CASH_ACCOUNT_NAME;
  await accountRepository.create(
    userId,
    "CASH",
    currency,
    {
      name,
      institution: null,
      openingBalance: 0,
      creditLimit: null,
      secondaryCurrency: null,
      secondaryCreditLimit: null,
      secondaryOpeningBalance: 0,
      closingDay: null,
      dueDay: null,
    },
    db,
  );
}

export async function deleteAccount(userId: string, id: string): Promise<Result<void>> {
  const account = await accountRepository.findById(userId, id);
  if (!account) return notFound("La cuenta");
  const guard = await guardLastCashAccount(userId, account);
  if (!guard.ok) return guard;
  const outcome = await accountRepository.delete(userId, id);
  if (outcome === "in_use") {
    return conflict(
      "La cuenta tiene movimientos. Archívala para ocultarla sin perder el historial.",
    );
  }
  return ok();
}
