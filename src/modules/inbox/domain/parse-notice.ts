import { detectInstitution, mentionedProfiles } from "./bank-profiles";
import type { NoticeInstrument, NoticeKind, ParsedNotice } from "./notice";
import { findAmount, findDate, findLast4, findTime, plain } from "./text";

export type NoticeInput = Readonly<{
  text: string;
  sender?: string | null;
  subject?: string | null;
}>;

/**
 * What kind of movement the text describes. Tested in order on the lowercase
 * text without accents, so the more specific phrases come first.
 */
const KIND_PATTERNS: readonly (readonly [NoticeKind, RegExp])[] = [
  [
    "CARD_PAYMENT",
    /\bpago (?:de|a|en) (?:tu |la |su )?(?:tarjeta|tc\b)|\bpagaste (?:tu |la )?tarjeta|\bpago (?:de )?(?:tu )?(?:estado de cuenta|facturacion)/,
  ],
  [
    "TRANSFER_IN",
    /\brecibiste (?:una )?transferencia|\btransferencia recibida|\bhas recibido|\brecibiste\b|\bte (?:han )?(?:transferido|enviado|transfirio|envio)\b|\babono (?:por|de) transferencia/,
  ],
  [
    "TRANSFER_OUT",
    /\btransferiste\b|\bhas transferido|\btransferencia (?:a terceros|a otros bancos|realizada|enviada|de fondos|exitosa|a )|\benviaste\b|\brealizaste una transferencia|\bcomprobante de transferencia/,
  ],
  [
    "WITHDRAWAL",
    /\b(?:giro|retiro)s? (?:de dinero|de efectivo|en cajero|por|realizado)|\bgiraste\b/,
  ],
  [
    "DEPOSIT",
    /\bdeposito\b|\bse (?:ha )?abonado\b|\babono en (?:tu )?cuenta|\bte abonamos|\bremuneracion|\babono recibido/,
  ],
  [
    "PURCHASE",
    /\bcompra\b|\bcompraste\b|\bpagaste\b|\bcargo\b|\bconsumo\b|\bcobro\b|\btransaccion\b|\bpago\b|\bcompras?\s+(?:aprobada|realizada|nacional|internacional)/,
  ],
];

const STOP = String.raw`(?=\s+(?:el|del|con|por|a las|fecha|monto|hora|desde|rut|cuenta|n°|nro|numero|banco)\b|\s+\d{1,2}(?:[/-]|:)\d|\s*[,;:\n]|\.(?:\s|$)|\s*$)`;

/** Negative lookahead for words that start a phrase, not a name ("en tu cuenta", "a Banco…"). */
function notFollowedBy(words: readonly string[]): string {
  const either = (w: string) => `[${w[0]!.toUpperCase()}${w[0]}]${w.slice(1)}`;
  return String.raw`(?!(?:${words.map(either).join("|")})\b)`;
}

const NAME = String.raw`([A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)*)`;
const LABELED =
  /\b(?:comercio|destinatario|beneficiario|nombre del destinatario|nombre|origen|remitente|ordenante)\s*:\s*([^\n,;]+?)(?=\s{2,}|\s*[,;\n]|\s+(?:rut|cuenta|banco|monto|fecha)\b|\s*$)/i;
const AFTER_EN = new RegExp(
  String.raw`\ben\s+${notFollowedBy(["tu", "su", "la", "el", "los", "las", "cuenta", "cajero", "linea", "nuestro", "nuestra", "chile", "pesos", "dolares", "cuota", "cuotas"])}([A-Za-z0-9*][^\n,;]*?)${STOP}`,
);
const AFTER_TO = new RegExp(
  String.raw`\b(?:a|para)\s+${notFollowedBy(["tu", "su", "la", "las", "el", "los", "traves", "nombre", "cuenta", "partir", "banco", "terceros"])}${NAME}${STOP}`,
);
const AFTER_FROM = new RegExp(
  String.raw`\b(?:de|desde)\s+${notFollowedBy(["tu", "su", "la", "las", "el", "los", "cuenta", "parte", "banco", "transferencia"])}${NAME}${STOP}`,
);

/**
 * Reads a bank notice: which bank, what kind of movement, amount, merchant or
 * counterparty, card and date. It never fails: whatever it cannot read stays
 * null and the person fills it in when reviewing.
 */
export function parseNotice(input: NoticeInput, receivedYear: number): ParsedNotice {
  const text = plain([input.subject, input.text].filter(Boolean).join(". "));
  const lower = text.toLowerCase();
  const profile = detectInstitution(input.sender ?? null, text);

  let kind: NoticeKind = KIND_PATTERNS.find(([, pattern]) => pattern.test(lower))?.[0] ?? "UNKNOWN";
  let amount = findAmount(text);
  let merchant: string | null = null;
  let last4 = findLast4(text);

  for (const rule of profile?.rules ?? []) {
    const groups = rule.pattern.exec(text)?.groups;
    if (!groups) continue;
    kind = rule.kind;
    if (groups.amount) amount = findAmount(groups.amount) ?? amount;
    if (groups.merchant) merchant = groups.merchant.trim();
    if (groups.last4) last4 = groups.last4;
    break;
  }

  merchant ??= findMerchant(text, kind);
  const others = mentionedProfiles(text).filter((p) => p.institution !== profile?.institution);

  return {
    institution: profile?.institution ?? null,
    kind,
    instrument: findInstrument(lower),
    amount: amount?.amount ?? null,
    currency: amount?.currency ?? null,
    merchant: cleanName(merchant),
    counterpartyInstitution:
      kind === "TRANSFER_OUT" || kind === "TRANSFER_IN" || kind === "CARD_PAYMENT"
        ? (others[0]?.institution ?? null)
        : null,
    last4,
    occurredOn: findDate(text, receivedYear),
    occurredTime: findTime(text),
  };
}

function findMerchant(text: string, kind: NoticeKind): string | null {
  const labeled = LABELED.exec(text)?.[1];
  if (labeled) return labeled;
  switch (kind) {
    case "TRANSFER_OUT":
      return AFTER_TO.exec(text)?.[1] ?? null;
    case "TRANSFER_IN":
    case "DEPOSIT":
      return AFTER_FROM.exec(text)?.[1] ?? null;
    case "CARD_PAYMENT":
      return null;
    default:
      return AFTER_EN.exec(text)?.[1] ?? null;
  }
}

function findInstrument(lower: string): NoticeInstrument | null {
  if (/\btarjeta de credito\b|\bcredito\b|\btc\b|\bcupo\b/.test(lower)) return "CREDIT";
  if (/\bdebito\b|\bcuenta (?:corriente|vista)\b|\bcuenta ?rut\b|\bchequera\b/.test(lower)) {
    return "DEBIT";
  }
  return null;
}

/** Trims punctuation and bank names left at the end; drops what is clearly not a name. */
function cleanName(name: string | null): string | null {
  if (!name) return null;
  const cleaned = name
    .replace(/\s+/g, " ")
    .replace(/[.\s*-]+$/, "")
    .trim();
  if (cleaned.length < 2 || /^\$|^\d+$/.test(cleaned)) return null;
  return cleaned.slice(0, 120);
}
