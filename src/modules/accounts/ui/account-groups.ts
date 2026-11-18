import {
  type Institution,
  findInstitution,
  normalizeInstitutionName,
} from "../domain/institutions";

export type AccountGroup<T> = Readonly<{
  key: string;
  /** Catalog name ("Santander"), the typed name, or null for accounts without an institution. */
  name: string | null;
  institution: Institution | null;
  accounts: readonly T[];
}>;

const NO_INSTITUTION = "__none__";

/**
 * Groups accounts by bank (or card issuer, wallet…). Names and aliases from the
 * catalog fall in the same group ("Banco Santander" and "Santander"); names not
 * in the catalog group by their normalized text. Groups are sorted by name, and
 * accounts without an institution (cash) come last. Account order is kept.
 */
export function groupByInstitution<T extends { institution: string | null }>(
  accounts: readonly T[],
): AccountGroup<T>[] {
  const groups = new Map<
    string,
    { name: string | null; institution: Institution | null; accounts: T[] }
  >();
  for (const account of accounts) {
    const institution = findInstitution(account.institution);
    const typed = account.institution?.trim() || null;
    const key = institution
      ? `catalog:${institution.id}`
      : typed
        ? `text:${normalizeInstitutionName(typed)}`
        : NO_INSTITUTION;
    const group = groups.get(key) ?? {
      name: institution?.name ?? typed,
      institution,
      accounts: [],
    };
    group.accounts.push(account);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .map(([key, group]) => ({ key, ...group }))
    .sort((a, b) => {
      if (a.name === null) return 1;
      if (b.name === null) return -1;
      return a.name.localeCompare(b.name, "es");
    });
}
