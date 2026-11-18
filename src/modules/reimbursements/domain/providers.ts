import type { ReimbursementKind } from "./reimbursement";

/**
 * Common Chilean payers, offered as suggestions (any name can be typed).
 * Add new ones here.
 */
export const PROVIDER_SUGGESTIONS: Readonly<Partial<Record<ReimbursementKind, readonly string[]>>> =
  {
    HEALTH_PLAN: [
      "Fonasa",
      "Isapre Banmédica",
      "Isapre Colmena",
      "Isapre Consalud",
      "Isapre Cruz Blanca",
      "Isapre Esencial",
      "Isapre Nueva Masvida",
      "Isapre Vida Tres",
    ],
    SUPPLEMENTARY_INSURANCE: [
      "BICE Vida",
      "Chilena Consolidada",
      "Consorcio",
      "MetLife",
      "Seguros Bci",
      "Seguros Falabella",
      "Vida Security",
      "Zurich",
    ],
    TAX: ["SII (Operación Renta)"],
  };

export function providerSuggestions(kind?: ReimbursementKind): string[] {
  const lists = kind ? [PROVIDER_SUGGESTIONS[kind] ?? []] : Object.values(PROVIDER_SUGGESTIONS);
  return lists.flatMap((list) => [...(list ?? [])]);
}
