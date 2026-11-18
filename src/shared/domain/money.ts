import { type CurrencyCode, fractionDigits } from "./currency";
import { type Result, ok, validationError } from "./result";

/**
 * Money is always an integer amount of the currency's minor unit.
 * Floats are never used to store or add money.
 */
export type Money = Readonly<{ amount: number; currency: CurrencyCode }>;

export function money(amount: number, currency: CurrencyCode): Money {
  assertMinorUnits(amount);
  return { amount, currency };
}

export function assertMinorUnits(amount: number): void {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`Money amounts must be safe integers in minor units, got ${amount}`);
  }
}

export function sumAmounts(amounts: readonly number[]): number {
  const total = amounts.reduce((acc, value) => acc + value, 0);
  assertMinorUnits(total);
  return total;
}

/**
 * Parses an amount typed by a person ("12.500", "1.234,56", "1234.5") into minor units.
 * The last "." or "," followed by 1..fractionDigits digits is the decimal separator;
 * any other separator is treated as a thousands separator.
 */
export function parseAmount(input: string, currency: CurrencyCode): Result<number> {
  const raw = input.replace(/[\s$]/g, "");
  if (raw === "") return validationError("Ingresa un monto.");
  if (!/^-?[\d.,]+$/.test(raw)) return validationError("El monto solo puede contener números.");

  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const digits = fractionDigits(currency);

  let integerPart = unsigned;
  let decimalPart = "";
  const lastSeparator = Math.max(unsigned.lastIndexOf("."), unsigned.lastIndexOf(","));
  if (lastSeparator !== -1) {
    const tail = unsigned.slice(lastSeparator + 1);
    const looksDecimal = digits > 0 && tail.length > 0 && tail.length <= digits;
    if (looksDecimal) {
      integerPart = unsigned.slice(0, lastSeparator);
      decimalPart = tail;
    }
  }
  integerPart = integerPart.replace(/[.,]/g, "");
  if (integerPart === "" && decimalPart === "") return validationError("Ingresa un monto válido.");
  if (!/^\d*$/.test(integerPart) || !/^\d*$/.test(decimalPart)) {
    return validationError("Ingresa un monto válido.");
  }

  const minor = Number((integerPart || "0") + decimalPart.padEnd(digits, "0"));
  if (!Number.isSafeInteger(minor)) return validationError("El monto es demasiado grande.");
  return ok(negative ? -minor : minor);
}

/** Inverse of `parseAmount`, used to pre-fill edit forms ("1234.5" for 123450 cents). */
export function toDecimalString(minor: number, currency: CurrencyCode): string {
  const digits = fractionDigits(currency);
  if (digits === 0) return String(minor);
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor)
    .toString()
    .padStart(digits + 1, "0");
  const integer = abs.slice(0, -digits);
  const decimals = abs.slice(-digits).replace(/0+$/, "");
  return decimals ? `${sign}${integer}.${decimals}` : `${sign}${integer}`;
}

/**
 * Splits a positive total into `parts` integer amounts that add up exactly to the total.
 * The rounding remainder goes to the first part.
 */
export function splitEvenly(total: number, parts: number): number[] {
  assertMinorUnits(total);
  if (!Number.isInteger(parts) || parts < 1) throw new RangeError("parts must be >= 1");
  const base = Math.trunc(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, index) => (index === 0 ? base + remainder : base));
}

/** Converts minor units between currencies. `rate` = units of `to` per 1 unit of `from`. */
export function convertAmount(
  minor: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rate: number,
): number {
  if (from === to) return minor;
  const scale = 10 ** (fractionDigits(to) - fractionDigits(from));
  const converted = minor * rate * scale;
  // Round half away from zero so that negative amounts mirror positive ones.
  return Math.sign(converted) * Math.round(Math.abs(converted));
}
