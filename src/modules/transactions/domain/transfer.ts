import type { Account } from "@/modules/accounts";
import {
  type CurrencyCode,
  type Result,
  convertAmount,
  ok,
  validationError,
} from "@/shared/domain";

export type TransferLegs = Readonly<{
  fromAmount: number;
  fromCurrency: CurrencyCode;
  toAmount: number;
  toCurrency: CurrencyCode;
}>;

/**
 * Amounts of a transfer. Between CLP and USD two of these three are enough:
 * what was sent, what was received, and the bank's rate in pesos per dollar
 * (the way banks quote it). Paying a card's dollar debt from a peso account is
 * the typical case: "I paid USD 100 and the bank charged me $97.000" or "the
 * bank used $970 per dollar".
 */
export function resolveTransferAmounts(input: {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  sent: number | null;
  received: number | null;
  clpPerUsd: number | null;
}): Result<{ sent: number; received: number }> {
  const { fromCurrency, toCurrency, sent, received, clpPerUsd } = input;
  const positive = (value: number | null) => value !== null && value > 0;

  if (fromCurrency === toCurrency) {
    const value = sent ?? received;
    if (value === null || value <= 0) {
      return validationError("El monto debe ser mayor que cero.", "amount");
    }
    return ok({ sent: value, received: value });
  }
  if (positive(sent) && positive(received)) return ok({ sent: sent!, received: received! });
  if (clpPerUsd !== null && clpPerUsd > 0) {
    const rate = (from: CurrencyCode) => (from === "USD" ? clpPerUsd : 1 / clpPerUsd);
    if (positive(received)) {
      return ok({
        sent: convertAmount(received!, toCurrency, fromCurrency, rate(toCurrency)),
        received: received!,
      });
    }
    if (positive(sent)) {
      return ok({
        sent: sent!,
        received: convertAmount(sent!, fromCurrency, toCurrency, rate(fromCurrency)),
      });
    }
  }
  if (!positive(received) && !positive(sent)) {
    return validationError(`Indica cuánto abonas en ${toCurrency}.`, "toAmount");
  }
  return validationError(
    `Indica cuánto pagaste en ${fromCurrency} o el tipo de cambio del banco.`,
    "amount",
  );
}

/**
 * A transfer is two movements that share a group id: money leaves `from` and
 * enters `to`. Paying a credit card is a transfer from a bank account to the
 * card, into its national or its international (other currency) debt.
 */
export function planTransfer(
  from: Account,
  to: Account,
  toCurrency: CurrencyCode,
  amounts: { sent: number; received: number },
): Result<TransferLegs> {
  if (from.id === to.id) {
    return validationError("Elige dos cuentas distintas.", "toAccountId");
  }
  const accepted = [to.currency, ...(to.secondaryCurrency ? [to.secondaryCurrency] : [])];
  if (!accepted.includes(toCurrency)) {
    return validationError(`La cuenta de destino no recibe ${toCurrency}.`, "toCurrency");
  }
  return ok({
    fromAmount: -amounts.sent,
    fromCurrency: from.currency,
    toAmount: amounts.received,
    toCurrency,
  });
}
