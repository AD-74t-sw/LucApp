import {
  type CurrencyCode,
  type LocalDate,
  daysInMonth,
  isLocalDate,
  localDate,
} from "@/shared/domain";

/** Without accents and with single spaces: "Depósito  en  línea" -> "Deposito en linea". */
export function plain(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/** Key to compare merchants and people: "LIDER EXPRESS 123" -> "liderexpress". */
export function merchantKey(name: string | null): string | null {
  if (!name) return null;
  const key = plain(name)
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return key.length >= 2 ? key : null;
}

const USD_AMOUNT = /(?:US\s?\$|U\$S|USD)\s*([0-9][0-9.,]*[0-9]|[0-9])/i;
const CLP_AMOUNT = /\$\s*([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]+)(?:,([0-9]{1,2}))?(?![0-9])/;

/**
 * First amount in the text, in minor units. Dollars are written "US$ 12,50",
 * "USD 1.234,56" or "USD 1,234.56"; pesos "$12.345" (dot for thousands).
 */
export function findAmount(text: string): { amount: number; currency: CurrencyCode } | null {
  const usd = USD_AMOUNT.exec(text);
  // "$" alone must not match inside "US$".
  const clp = CLP_AMOUNT.exec(text.replace(/(US\s?|U)\$/gi, (m) => m.replace("$", "§")));
  const usdAt = usd?.index ?? Infinity;
  const clpAt = clp?.index ?? Infinity;
  if (usd && usdAt <= clpAt) {
    const cents = parseDecimal(usd[1]!);
    return cents === null ? null : { amount: cents, currency: "USD" };
  }
  if (clp) {
    const pesos = Number(clp[1]!.replace(/\./g, ""));
    const rounded = Math.round(pesos + Number(`0.${clp[2] ?? "0"}`));
    return rounded > 0 ? { amount: rounded, currency: "CLP" } : null;
  }
  return null;
}

/** "1.234,56", "1,234.56", "12,5" or "1234" -> cents. The last separator followed by 1-2 digits is the decimal one. */
export function parseDecimal(value: string): number | null {
  const match = /^(.*?)(?:[.,](\d{1,2}))?$/.exec(value);
  if (!match) return null;
  const whole = Number((match[1] ?? "").replace(/[.,]/g, "") || "0");
  const fraction = match[2] ? Number(match[2].padEnd(2, "0")) : 0;
  const cents = whole * 100 + fraction;
  return Number.isFinite(cents) && cents > 0 ? cents : null;
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "14/11/2026", "14-11-26" or "14 de noviembre de 2026". Without a year, uses `fallbackYear`. */
export function findDate(text: string, fallbackYear: number): LocalDate | null {
  const numeric = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4}|\d{2})\b/.exec(text);
  if (numeric) {
    const year = Number(numeric[3]!.length === 2 ? `20${numeric[3]}` : numeric[3]);
    return safeDate(year, Number(numeric[2]), Number(numeric[1]));
  }
  const written = new RegExp(
    `\\b(\\d{1,2}) de (${MONTHS.join("|")})(?: de(?:l)? (\\d{4}))?`,
    "i",
  ).exec(text);
  if (written) {
    const month = MONTHS.indexOf(written[2]!.toLowerCase()) + 1;
    return safeDate(Number(written[3] ?? fallbackYear), month, Number(written[1]));
  }
  return null;
}

function safeDate(year: number, month: number, day: number): LocalDate | null {
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  const date = localDate(year, month, day);
  return isLocalDate(date) ? date : null;
}

/** "12:34", "9:05:10" or "12:34 hrs" -> "12:34". */
export function findTime(text: string): string | null {
  const match = /\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/.exec(text);
  return match ? `${match[1]!.padStart(2, "0")}:${match[2]}` : null;
}

/** Card or account ending: "****1234", "XXXX1234", "terminada en 1234". */
export function findLast4(text: string): string | null {
  const match = /(?:\*{2,}|[xX]{3,}|terminad[ao]\s+en|finalizad[ao]\s+en)\s*(\d{4})\b/.exec(text);
  return match?.[1] ?? null;
}

export function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/** Email bodies may arrive as HTML: keep the readable text. */
export function htmlToText(value: string): string {
  if (!/<[a-z!/][\s\S]*>/i.test(value)) return value;
  return value
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#36;/g, "$")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}
