/**
 * Financial institutions people in Chile use, by commercial name.
 *
 * Banks come from the CMF list of supervised banks (retail banks only; foreign
 * bank branches without personal accounts are left out). Card issuers, wallets
 * and cooperatives are the most common consumer brands. Logos are each
 * institution's own site icon, stored in /public/institutions, and are
 * trademarks of their owners, used only to identify them.
 *
 * Accounts store the institution as free text; `findInstitution` maps names and
 * common aliases ("Banco Edwards", "CuentaRUT", "Banco Security"…) to an entry.
 */

export type InstitutionKind = "BANK" | "CARD" | "WALLET" | "COOPERATIVE";

export type Institution = Readonly<{
  id: string;
  name: string;
  kind: InstitutionKind;
  logo: string;
  aliases?: readonly string[];
  /** Short clarification shown in the picker. */
  note?: string;
}>;

const logo = (file: string) => `/institutions/${file}.png`;

export const INSTITUTIONS: readonly Institution[] = [
  // Banks (CMF: "Bancos establecidos en Chile" and "Bancos estatales")
  {
    id: "bancoestado",
    name: "BancoEstado",
    kind: "BANK",
    logo: logo("bancoestado"),
    aliases: [
      "Banco Estado",
      "Banco del Estado",
      "Banco del Estado de Chile",
      "CuentaRUT",
      "Cuenta RUT",
    ],
  },
  {
    id: "banco-de-chile",
    name: "Banco de Chile",
    kind: "BANK",
    logo: logo("banco-de-chile"),
    aliases: [
      "Bancochile",
      "Banco Edwards",
      "Edwards",
      "Banco Edwards Citi",
      "Citi",
      "CrediChile",
      "Atlas",
    ],
  },
  {
    id: "santander",
    name: "Santander",
    kind: "BANK",
    logo: logo("santander"),
    aliases: ["Banco Santander", "Banco Santander-Chile", "Banefe"],
  },
  {
    id: "bci",
    name: "Bci",
    kind: "BANK",
    logo: logo("bci"),
    aliases: ["Banco de Crédito e Inversiones", "TBanc", "Banco Nova"],
  },
  {
    id: "scotiabank",
    name: "Scotiabank",
    kind: "BANK",
    logo: logo("scotiabank"),
    aliases: ["Scotiabank Chile", "BancoDesarrollo", "Banco Desarrollo"],
  },
  {
    id: "itau",
    name: "Itaú",
    kind: "BANK",
    logo: logo("itau"),
    aliases: ["Banco Itaú", "Banco Itaú Chile", "Itaú Corpbanca", "Corpbanca"],
  },
  {
    id: "bice",
    name: "Banco BICE",
    kind: "BANK",
    logo: logo("bice"),
    aliases: ["BICE", "Banco Security", "Security"],
    note: "Incluye Banco Security",
  },
  {
    id: "banco-falabella",
    name: "Banco Falabella",
    kind: "BANK",
    logo: logo("banco-falabella"),
    aliases: ["Falabella"],
  },
  {
    id: "banco-ripley",
    name: "Banco Ripley",
    kind: "BANK",
    logo: logo("banco-ripley"),
    aliases: ["Ripley"],
  },
  {
    id: "banco-consorcio",
    name: "Banco Consorcio",
    kind: "BANK",
    logo: logo("banco-consorcio"),
    aliases: ["Consorcio"],
  },
  {
    id: "banco-internacional",
    name: "Banco Internacional",
    kind: "BANK",
    logo: logo("banco-internacional"),
  },
  {
    id: "btg-pactual",
    name: "BTG Pactual",
    kind: "BANK",
    logo: logo("btg-pactual"),
    aliases: ["Banco BTG Pactual", "Banco BTG Pactual Chile"],
  },
  {
    id: "hsbc",
    name: "HSBC",
    kind: "BANK",
    logo: logo("hsbc"),
    aliases: ["HSBC Bank", "HSBC Bank Chile"],
  },
  {
    id: "tanner",
    name: "Tanner Banco Digital",
    kind: "BANK",
    logo: logo("tanner"),
    aliases: ["Tanner"],
  },
  {
    id: "tenpo",
    name: "Tenpo",
    kind: "BANK",
    logo: logo("tenpo"),
    aliases: ["Tenpo Bank", "Tenpo Bank Chile"],
  },

  // Store and co-branded credit cards
  {
    id: "cmr",
    name: "CMR Falabella",
    kind: "CARD",
    logo: logo("banco-falabella"),
    aliases: ["CMR"],
    note: "Banco Falabella",
  },
  {
    id: "tarjeta-ripley",
    name: "Tarjeta Ripley",
    kind: "CARD",
    logo: logo("banco-ripley"),
    note: "Banco Ripley",
  },
  {
    id: "cencosud",
    name: "Tarjeta Cencosud Scotiabank",
    kind: "CARD",
    logo: logo("scotiabank"),
    aliases: ["Cencosud", "Tarjeta Cencosud"],
    note: "Scotiabank",
  },
  {
    id: "lider-bci",
    name: "Lider Bci",
    kind: "CARD",
    logo: logo("bci"),
    aliases: ["Lider", "Tarjeta Lider"],
    note: "Bci",
  },
  {
    id: "abc",
    name: "abc (La Polar)",
    kind: "CARD",
    logo: logo("la-polar"),
    aliases: ["abc", "La Polar", "abcdin", "abc din"],
  },
  { id: "hites", name: "Hites", kind: "CARD", logo: logo("hites"), aliases: ["Tarjeta Hites"] },
  {
    id: "tricot",
    name: "Tricot",
    kind: "CARD",
    logo: logo("tricot"),
    aliases: ["Tricard", "Tarjeta Tricot"],
  },

  // Wallets and digital accounts
  { id: "mach", name: "MACH", kind: "WALLET", logo: logo("mach"), note: "Bci" },
  { id: "mercado-pago", name: "Mercado Pago", kind: "WALLET", logo: logo("mercado-pago") },
  { id: "prex", name: "Prex", kind: "WALLET", logo: logo("prex") },
  { id: "global66", name: "Global66", kind: "WALLET", logo: logo("global66") },
  { id: "fintual", name: "Fintual", kind: "WALLET", logo: logo("fintual") },
  {
    id: "los-heroes",
    name: "Los Héroes",
    kind: "WALLET",
    logo: logo("los-heroes"),
    aliases: ["Caja Los Héroes"],
  },

  // Savings and credit cooperatives
  { id: "coopeuch", name: "Coopeuch", kind: "COOPERATIVE", logo: logo("coopeuch") },
];

export const INSTITUTION_KIND_LABELS: Record<InstitutionKind, string> = {
  BANK: "Bancos",
  CARD: "Tarjetas de casas comerciales",
  WALLET: "Billeteras y cuentas digitales",
  COOPERATIVE: "Cooperativas",
};

/** Lowercase, without accents or punctuation: "Banco Itaú-Chile" -> "bancoitauchile". */
export function normalizeInstitutionName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const BY_NAME = new Map<string, Institution>();
for (const institution of INSTITUTIONS) {
  for (const name of [institution.name, ...(institution.aliases ?? [])]) {
    BY_NAME.set(normalizeInstitutionName(name), institution);
  }
}

/** Catalog entry for a stored institution name (exact name or alias), if any. */
export function findInstitution(name: string | null | undefined): Institution | null {
  if (!name) return null;
  return BY_NAME.get(normalizeInstitutionName(name)) ?? null;
}

/** Entries whose name or aliases contain the query (all of them for an empty query). */
export function searchInstitutions(query: string): Institution[] {
  const q = normalizeInstitutionName(query);
  if (!q) return [...INSTITUTIONS];
  return INSTITUTIONS.filter((i) =>
    [i.name, ...(i.aliases ?? [])].some((n) => normalizeInstitutionName(n).includes(q)),
  );
}
