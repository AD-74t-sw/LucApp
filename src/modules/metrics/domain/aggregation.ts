import type { CostType, Necessity } from "@/modules/categories";
import type { CurrencyCode, LocalDate } from "@/shared/domain";

/** Converts minor units into the base currency on a date; null when the rate is unknown. */
export type Converter = (amount: number, currency: CurrencyCode, date: LocalDate) => number | null;

/**
 * Converts and adds amounts. Amounts whose currency has no known rate are left
 * out and reported in `missing`, so the UI can say which rates are needed.
 */
export class BaseCurrencySum {
  readonly missing = new Set<CurrencyCode>();

  constructor(private readonly convert: Converter) {}

  /** Records that an amount in `currency` could not be converted. */
  markMissing(currency: CurrencyCode): void {
    this.missing.add(currency);
  }

  of(amount: number, currency: CurrencyCode, date: LocalDate): number {
    const converted = this.convert(amount, currency, date);
    if (converted === null) {
      this.missing.add(currency);
      return 0;
    }
    return converted;
  }
}

export type CategorySlice = Readonly<{
  id: string;
  name: string;
  color: string;
  amount: number;
  /** Fraction of total spending (0..1). */
  share: number;
  children: readonly { id: string; name: string; amount: number }[];
}>;

/** Groups subcategory spending under its parent category, biggest first. */
export function rollupByParent(
  rows: readonly {
    categoryId: string;
    name: string;
    color: string;
    parentId: string | null;
    parentName: string | null;
    parentColor: string | null;
    amount: number;
  }[],
): CategorySlice[] {
  const groups = new Map<
    string,
    {
      id: string;
      name: string;
      color: string;
      amount: number;
      children: Map<string, { id: string; name: string; amount: number }>;
    }
  >();
  for (const row of rows) {
    const id = row.parentId ?? row.categoryId;
    const group = groups.get(id) ?? {
      id,
      name: row.parentName ?? row.name,
      color: row.parentColor ?? row.color,
      amount: 0,
      children: new Map(),
    };
    group.amount += row.amount;
    if (row.parentId) {
      const child = group.children.get(row.categoryId) ?? {
        id: row.categoryId,
        name: row.name,
        amount: 0,
      };
      child.amount += row.amount;
      group.children.set(row.categoryId, child);
    }
    groups.set(id, group);
  }
  const total = [...groups.values()].reduce((sum, g) => sum + g.amount, 0);
  return [...groups.values()]
    .filter((g) => g.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map((g) => ({
      id: g.id,
      name: g.name,
      color: g.color,
      amount: g.amount,
      share: total > 0 ? g.amount / total : 0,
      children: [...g.children.values()].sort((a, b) => b.amount - a.amount),
    }));
}

export type ClassificationSplit = Readonly<{
  costType: Readonly<Record<CostType | "UNCLASSIFIED", number>>;
  necessity: Readonly<Record<Necessity | "UNCLASSIFIED", number>>;
}>;

export function splitByClassification(
  rows: readonly { costType: CostType | null; necessity: Necessity | null; amount: number }[],
): ClassificationSplit {
  const costType = { FIXED: 0, VARIABLE: 0, UNCLASSIFIED: 0 };
  const necessity = { ESSENTIAL: 0, DISCRETIONARY: 0, UNCLASSIFIED: 0 };
  for (const row of rows) {
    costType[row.costType ?? "UNCLASSIFIED"] += row.amount;
    necessity[row.necessity ?? "UNCLASSIFIED"] += row.amount;
  }
  return { costType, necessity };
}

/** Share of income that was not spent; null when there is no income. */
export function savingsRate(income: number, expense: number): number | null {
  return income > 0 ? (income - expense) / income : null;
}
