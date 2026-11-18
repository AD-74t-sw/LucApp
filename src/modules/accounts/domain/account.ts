import { type CurrencyCode, type Result, ok, validationError } from "@/shared/domain";

export const ACCOUNT_TYPES = [
  "CHECKING",
  "SAVINGS",
  "CASH",
  "DIGITAL_WALLET",
  "CREDIT_CARD",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type Account = Readonly<{
  id: string;
  type: AccountType;
  name: string;
  institution: string | null;
  currency: CurrencyCode;
  /** Signed balance before the first registered movement. Negative = debt. */
  openingBalance: number;
  /** Credit line, only for credit cards. */
  creditLimit: number | null;
  /**
   * Credit cards may also carry debt in the other currency (the "international"
   * quota of Chilean cards), with its own credit line and opening debt.
   */
  secondaryCurrency: CurrencyCode | null;
  secondaryCreditLimit: number | null;
  secondaryOpeningBalance: number;
  closingDay: number | null;
  dueDay: number | null;
  archived: boolean;
}>;

export function isCreditAccount(type: AccountType): boolean {
  return type === "CREDIT_CARD";
}

/** Name of the cash account every user starts with. */
export const DEFAULT_CASH_ACCOUNT_NAME = "Efectivo";

/** Currencies an account can hold movements in: its own, plus the international one of a card. */
export function accountCurrencies(
  account: Pick<Account, "currency" | "secondaryCurrency">,
): CurrencyCode[] {
  return account.secondaryCurrency
    ? [account.currency, account.secondaryCurrency]
    : [account.currency];
}

export function supportsCurrency(
  account: Pick<Account, "currency" | "secondaryCurrency">,
  currency: CurrencyCode,
): boolean {
  return accountCurrencies(account).includes(currency);
}

/** Cash has no cards; credit card accounts hold credit cards; the rest hold debit cards. */
export function canHaveCards(type: AccountType): boolean {
  return type !== "CASH";
}

/**
 * On credit cards people type the debt they currently have as a positive number;
 * it is stored as a negative balance.
 */
export function openingBalanceFromInput(type: AccountType, typed: number): number {
  return isCreditAccount(type) ? -Math.abs(typed) : typed;
}

export function openingBalanceForInput(account: Pick<Account, "type" | "openingBalance">): number {
  return isCreditAccount(account.type) ? Math.abs(account.openingBalance) : account.openingBalance;
}

export function validateAccountRules(input: {
  type: AccountType;
  currency: CurrencyCode;
  creditLimit: number | null;
  closingDay: number | null;
  dueDay: number | null;
  secondaryCurrency: CurrencyCode | null;
  secondaryCreditLimit: number | null;
}): Result<void> {
  const credit = isCreditAccount(input.type);
  if (input.secondaryCurrency !== null) {
    if (!credit) {
      return validationError(
        "Solo las tarjetas de crédito tienen cupo internacional.",
        "international",
      );
    }
    if (input.secondaryCurrency === input.currency) {
      return validationError("El cupo internacional debe ser en la otra moneda.", "international");
    }
    if (input.secondaryCreditLimit === null || input.secondaryCreditLimit <= 0) {
      return validationError("Indica el cupo internacional.", "secondaryCreditLimit");
    }
  }
  if (credit && (input.creditLimit === null || input.creditLimit <= 0)) {
    return validationError("Indica el cupo total de la tarjeta.", "creditLimit");
  }
  if (!credit && input.creditLimit !== null) {
    return validationError("Solo las tarjetas de crédito tienen cupo.", "creditLimit");
  }
  if (!credit && (input.closingDay !== null || input.dueDay !== null)) {
    return validationError(
      "Solo las tarjetas de crédito tienen fecha de facturación.",
      "closingDay",
    );
  }
  return ok();
}

/** Remaining credit line given the current (negative when owing) balance. */
export function availableCredit(
  account: Pick<Account, "creditLimit">,
  balance: number,
): number | null {
  return account.creditLimit === null ? null : account.creditLimit + balance;
}

export function creditUsage(account: Pick<Account, "creditLimit">, balance: number): number | null {
  if (!account.creditLimit) return null;
  return Math.max(0, -balance) / account.creditLimit;
}
