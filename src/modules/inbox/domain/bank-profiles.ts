import type { NoticeKind } from "./notice";

/**
 * Optional bank-specific pattern, tried before the generic reading. Named
 * groups fill the notice: `amount` ("$12.345"), `merchant`, `last4`.
 */
export type NoticeRule = Readonly<{ kind: NoticeKind; pattern: RegExp }>;

export type BankProfile = Readonly<{
  /** Exactly as in the institutions catalog (accounts module), so logos and accounts match. */
  institution: string;
  /** Email domains or SMS sender names the notices come from. */
  senders: readonly RegExp[];
  /** Name of the bank's app when it differs from how the bank is named ("Mi Banco"). */
  apps?: readonly RegExp[];
  /** How the text names the bank, for pasted notices or unknown senders. Tested without accents. */
  mentions: readonly RegExp[];
  rules?: readonly NoticeRule[];
}>;

/**
 * Banks, card issuers and wallets whose notices LucApp recognizes.
 *
 * To add one: append an entry with its catalog name, the domain it emails
 * from, the SMS sender name, its app's name (only if the bank's name is not in
 * it) and how its texts name it. Most notices are read
 * by the generic rules (amount, "compra en…", "transferiste a…"); add `rules`
 * only when a bank writes something they miss, with a test using a real
 * (anonymized) notice. More specific entries go first: "Lider Bci" and MACH
 * before Bci, CMR before Banco Falabella.
 */
export const BANK_PROFILES: readonly BankProfile[] = [
  {
    institution: "MACH",
    senders: [/somosmach\.com/i, /^mach$/i],
    mentions: [/\bmach\b/i],
  },
  {
    institution: "Lider Bci",
    senders: [/liderbci\.cl/i, /tarjetalider/i],
    mentions: [/\blider bci\b/i, /tarjeta lider/i],
  },
  {
    institution: "Tenpo",
    senders: [/tenpo\.cl/i, /^tenpo$/i],
    mentions: [/\btenpo\b/i],
  },
  {
    institution: "Banco de Chile",
    senders: [/bancochile\.cl/i, /bancoedwards\.cl/i, /^banco ?chile$/i, /^bchile$/i],
    apps: [/^mi banco\b/i, /^mi pago\b/i],
    mentions: [/\bbanco de chile\b/i, /\bbanco edwards\b/i, /\bbancochile\b/i],
  },
  {
    institution: "Santander",
    senders: [/santander\.cl/i, /^santander$/i],
    mentions: [/\bsantander\b/i],
  },
  {
    institution: "BancoEstado",
    senders: [/bancoestado\.cl/i, /^banco ?estado$/i],
    mentions: [/\bbanco ?estado\b/i, /\bcuenta ?rut\b/i, /\bbanco del estado\b/i],
  },
  {
    institution: "Bci",
    senders: [/bci\.cl/i, /^bci$/i],
    mentions: [/\bbci\b/i, /banco de credito e inversiones/i],
  },
  {
    institution: "Tarjeta Cencosud Scotiabank",
    senders: [/tarjetacencosud\.cl/i, /cencosudscotiabank/i],
    mentions: [/\btarjeta cencosud\b/i],
  },
  {
    institution: "Scotiabank",
    senders: [/scotiabank\.cl/i, /scotiabankchile/i, /^scotiabank$/i],
    mentions: [/\bscotiabank\b/i, /\bscotia\b/i],
  },
  {
    institution: "Itaú",
    senders: [/itau\.cl/i, /^itau$/i],
    mentions: [/\bitau\b/i],
  },
  {
    institution: "Banco BICE",
    senders: [/bice\.cl/i, /^bice$/i],
    mentions: [/\bbice\b/i, /\bbanco security\b/i],
  },
  {
    institution: "CMR Falabella",
    senders: [/cmrfalabella\.com/i],
    apps: [/^cmr\b/i],
    mentions: [/\bcmr\b/i],
  },
  {
    institution: "Banco Falabella",
    senders: [/bancofalabella\.cl/i, /^banco ?falabella$/i],
    mentions: [/\bbanco falabella\b/i],
  },
  {
    institution: "Tarjeta Ripley",
    senders: [/tarjetaripley/i],
    mentions: [/\btarjeta ripley\b/i],
  },
  {
    institution: "Banco Ripley",
    senders: [/bancoripley\.cl/i, /^banco ?ripley$/i],
    mentions: [/\bbanco ripley\b/i],
  },
  {
    institution: "Banco Consorcio",
    senders: [/bancoconsorcio\.cl/i],
    mentions: [/\bbanco consorcio\b/i],
  },
  {
    institution: "Banco Internacional",
    senders: [/internacional\.cl/i],
    mentions: [/\bbanco internacional\b/i],
  },
  { institution: "BTG Pactual", senders: [/btgpactual/i], mentions: [/\bbtg\b/i] },
  { institution: "HSBC", senders: [/hsbc\./i], mentions: [/\bhsbc\b/i] },
  {
    institution: "Tanner Banco Digital",
    senders: [/tanner\.cl/i],
    mentions: [/\btanner\b/i],
  },
  {
    institution: "abc (La Polar)",
    senders: [/abcvisa\.cl/i, /lapolar\.cl/i],
    mentions: [/\babcvisa\b/i, /\btarjeta abc\b/i, /\bla polar\b/i],
  },
  { institution: "Hites", senders: [/hites\.(?:cl|com)/i], mentions: [/\bhites\b/i] },
  { institution: "Tricot", senders: [/tricot\.cl/i], mentions: [/\btricot\b/i] },
  {
    institution: "Mercado Pago",
    senders: [/mercadopago\./i, /mercadolibre\./i],
    mentions: [/\bmercado ?pago\b/i],
  },
  { institution: "Prex", senders: [/prex\.cl/i, /^prex$/i], mentions: [/\bprex\b/i] },
  {
    institution: "Global66",
    senders: [/global66\.com/i],
    mentions: [/\bglobal ?66\b/i],
  },
  { institution: "Fintual", senders: [/fintual\.(?:cl|com)/i], mentions: [/\bfintual\b/i] },
  {
    institution: "Los Héroes",
    senders: [/losheroes\.cl/i],
    mentions: [/\blos heroes\b/i],
  },
  { institution: "Coopeuch", senders: [/coopeuch\.cl/i], mentions: [/\bcoopeuch\b/i] },
];

/**
 * Bank that sent the notice: by sender (email domain, SMS name or app name)
 * first, then by how the sender or the text names it.
 */
export function detectInstitution(sender: string | null, text: string): BankProfile | null {
  if (sender) {
    const from = sender.trim();
    const bySender = BANK_PROFILES.find((p) =>
      [...p.senders, ...(p.apps ?? [])].some((s) => s.test(from)),
    );
    // An app or a contact named after the bank: "Santander Chile", "Scotiabank GO".
    const named = bySender ?? mentionedProfiles(plainName(from))[0];
    if (named) return named;
  }
  return mentionedProfiles(text)[0] ?? null;
}

function plainName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Every profile the text names, in the order they first appear. */
export function mentionedProfiles(text: string): BankProfile[] {
  const found: { profile: BankProfile; start: number; end: number }[] = [];
  for (const profile of BANK_PROFILES) {
    const matches = profile.mentions
      .map((m) => m.exec(text))
      .filter((m): m is RegExpExecArray => m !== null);
    if (matches.length === 0) continue;
    const first = matches.reduce((a, b) => (b.index < a.index ? b : a));
    const start = first.index;
    const end = start + first[0].length;
    // "Lider Bci" also contains "Bci": keep only the more specific entry (listed first).
    if (found.some((f) => start < f.end && end > f.start)) continue;
    found.push({ profile, start, end });
  }
  return found.sort((a, b) => a.start - b.start).map((f) => f.profile);
}
