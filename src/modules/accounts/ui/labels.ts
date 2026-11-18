import type { AccountType } from "../domain/account";
import type { CardKind, CardNetwork } from "../domain/card";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: "Cuenta corriente / vista",
  SAVINGS: "Cuenta de ahorro",
  CASH: "Efectivo",
  DIGITAL_WALLET: "Billetera digital",
  CREDIT_CARD: "Tarjeta de crédito",
};

export const CARD_NETWORK_LABELS: Record<CardNetwork, string> = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  AMEX: "American Express",
  DINERS: "Diners Club",
  OTHER: "Otra",
};

export const CARD_KIND_LABELS: Record<CardKind, string> = {
  CREDIT: "Crédito",
  DEBIT: "Débito",
};
