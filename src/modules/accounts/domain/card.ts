import { type Result, ok, validationError } from "@/shared/domain";
import { type Account, type AccountType, canHaveCards, isCreditAccount } from "./account";

export const CARD_NETWORKS = ["VISA", "MASTERCARD", "AMEX", "DINERS", "OTHER"] as const;
export type CardNetwork = (typeof CARD_NETWORKS)[number];

export type CardKind = "CREDIT" | "DEBIT";

export type Card = Readonly<{
  id: string;
  accountId: string;
  name: string;
  network: CardNetwork;
  last4: string | null;
  archived: boolean;
  /** Derived from the account: cards on a credit card account are credit cards. */
  kind: CardKind;
}>;

export function cardKind(accountType: AccountType): CardKind {
  return isCreditAccount(accountType) ? "CREDIT" : "DEBIT";
}

export function validateCardAccount(account: Pick<Account, "type" | "archived">): Result<void> {
  if (!canHaveCards(account.type)) {
    return validationError("Las cuentas de efectivo no tienen tarjetas.", "accountId");
  }
  if (account.archived) {
    return validationError("No puedes agregar tarjetas a una cuenta archivada.", "accountId");
  }
  return ok();
}
