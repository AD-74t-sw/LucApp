/**
 * Supported ISO 4217 currencies (for now only Chilean pesos and US dollars).
 * `fractionDigits` defines the size of the minor unit used to store amounts
 * (CLP has no decimals, so 1 minor unit = 1 peso; USD uses cents).
 */
export const CURRENCIES = {
  CLP: { name: "Peso chileno", fractionDigits: 0 },
  USD: { name: "Dólar estadounidense", fractionDigits: 2 },
} as const satisfies Record<string, { name: string; fractionDigits: number }>;

export type CurrencyCode = keyof typeof CURRENCIES;

export const CURRENCY_CODES = Object.keys(CURRENCIES) as [CurrencyCode, ...CurrencyCode[]];

export const DEFAULT_CURRENCY: CurrencyCode = "CLP";

export function isCurrencyCode(value: string): value is CurrencyCode {
  return Object.hasOwn(CURRENCIES, value);
}

/** Narrows a value read from storage; throws if the database holds an unknown code. */
export function toCurrencyCode(value: string): CurrencyCode {
  const code = value.trim().toUpperCase();
  if (!isCurrencyCode(code)) {
    throw new Error(`Unsupported currency code: ${value}`);
  }
  return code;
}

export function fractionDigits(currency: CurrencyCode): number {
  return CURRENCIES[currency].fractionDigits;
}

/** With exactly two supported currencies, the "other" one is well defined (CLP <-> USD). */
export function otherCurrency(currency: CurrencyCode): CurrencyCode {
  return currency === "CLP" ? "USD" : "CLP";
}
