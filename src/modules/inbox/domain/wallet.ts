import type { CurrencyCode } from "@/shared/domain";
import { mentionedProfiles } from "./bank-profiles";
import type { ParsedNotice } from "./notice";
import { findAmount, parseDecimal, plain } from "./text";

/** What the Wallet "Transaction" automation of iOS Shortcuts hands over. */
export type WalletPayment = Readonly<{
  /** As Shortcuts formats it: "$12.990", "12990", "CLP 12.990", "US$ 10,50". */
  amount?: string | null;
  merchant?: string | null;
  /** Name of the card in Wallet: "Visa Banco de Chile", "Tenpo Mastercard". */
  card?: string | null;
  currency?: CurrencyCode | null;
}>;

/**
 * Amount of an Apple Pay payment. Unlike a bank text, the value can come as a
 * bare number, so the currency falls back to the given one (pesos by default).
 */
export function walletAmount(
  value: string,
  fallback: CurrencyCode = "CLP",
): { amount: number; currency: CurrencyCode } | null {
  const written = findAmount(value);
  if (written) return written;
  const number = /[0-9][0-9.,]*/.exec(value)?.[0].replace(/[.,]+$/, "");
  if (!number) return null;
  const currency: CurrencyCode = /\busd\b|us\$/i.test(value)
    ? "USD"
    : /\bclp\b/i.test(value)
      ? "CLP"
      : fallback;
  const cents = parseDecimal(number);
  if (cents === null) return null;
  const amount = currency === "USD" ? cents : Math.round(cents / 100);
  return amount > 0 ? { amount, currency } : null;
}

/**
 * An Apple Pay payment as a notice. It is always a purchase; the bank and the
 * kind of card are read from the card's name. Null without amount or merchant
 * (nothing to record).
 */
export function parseWalletPayment(
  payment: WalletPayment,
): { parsed: ParsedNotice; text: string } | null {
  const merchant = payment.merchant?.replace(/\s+/g, " ").trim() || null;
  const amount = payment.amount ? walletAmount(payment.amount, payment.currency ?? "CLP") : null;
  if (!amount || !merchant) return null;
  const card = payment.card?.replace(/\s+/g, " ").trim() || null;
  const cardName = card ? plain(card).toLowerCase() : "";

  const shown =
    amount.currency === "USD"
      ? `US$ ${(amount.amount / 100).toFixed(2).replace(".", ",")}`
      : `$${amount.amount.toLocaleString("es-CL")}`;
  return {
    text: `Apple Pay: ${shown} en ${merchant}${card ? ` con ${card}` : ""}`,
    parsed: {
      institution: card ? (mentionedProfiles(plain(card))[0]?.institution ?? null) : null,
      kind: "PURCHASE",
      instrument: /\bcredito\b|\bcredit\b/.test(cardName)
        ? "CREDIT"
        : /\bdebito\b|\bdebit\b|\bcuenta\b|\bprepago\b/.test(cardName)
          ? "DEBIT"
          : null,
      amount: amount.amount,
      currency: amount.currency,
      merchant: merchant.slice(0, 120),
      counterpartyInstitution: null,
      last4: /(?:^|\D)(\d{4})$/.exec(card ?? "")?.[1] ?? null,
      occurredOn: null,
      occurredTime: null,
    },
  };
}

/** Key to remember which account a Wallet card belongs to (never collides with a merchant key). */
export function walletCardKey(card: string | null | undefined): string | null {
  if (!card) return null;
  const key = plain(card)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return key.length >= 2 ? `wallet-card:${key}` : null;
}
