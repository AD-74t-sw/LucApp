import { type Result, ok, validationError } from "@/shared/domain";

export const CATEGORY_KINDS = ["EXPENSE", "INCOME"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

/** Fixed costs repeat every month (rent); variable ones change (groceries). */
export const COST_TYPES = ["FIXED", "VARIABLE"] as const;
export type CostType = (typeof COST_TYPES)[number];

/** Essential spending vs. discretionary spending (wants). */
export const NECESSITIES = ["ESSENTIAL", "DISCRETIONARY"] as const;
export type Necessity = (typeof NECESSITIES)[number];

export type Classification = Readonly<{ costType: CostType | null; necessity: Necessity | null }>;

export type Category = Readonly<{
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  parentId: string | null;
  defaultCostType: CostType | null;
  defaultNecessity: Necessity | null;
  archived: boolean;
}>;

export type CategoryNode = Category & { readonly children: readonly Category[] };

/** Categories form a tree of at most two levels: parent > subcategory. */
export function buildTree(categories: readonly Category[]): CategoryNode[] {
  const byName = (a: Category, b: Category) => a.name.localeCompare(b.name, "es");
  const roots = categories.filter((c) => c.parentId === null).sort(byName);
  return roots.map((root) => ({
    ...root,
    children: categories.filter((c) => c.parentId === root.id).sort(byName),
  }));
}

/** Checks that `parent` can contain a subcategory of the given kind. */
export function validateParent(
  kind: CategoryKind,
  parent: Category | null,
  options: { selfId?: string; selfHasChildren?: boolean } = {},
): Result<void> {
  if (!parent) return ok();
  if (parent.id === options.selfId) {
    return validationError("Una categoría no puede ser su propia madre.", "parentId");
  }
  if (parent.parentId !== null) {
    return validationError(
      "Solo se permiten dos niveles: elige una categoría principal.",
      "parentId",
    );
  }
  if (parent.kind !== kind) {
    return validationError("La subcategoría debe ser del mismo tipo que la principal.", "parentId");
  }
  if (options.selfHasChildren) {
    return validationError(
      "Esta categoría tiene subcategorías, por lo que no puede pasar a ser subcategoría.",
      "parentId",
    );
  }
  return ok();
}

/**
 * Classification for a new expense: explicit choice > subcategory default > parent default.
 */
export function resolveClassification(
  category: Category,
  parent: Category | null,
  override: Partial<Classification> = {},
): Classification {
  return {
    costType: override.costType ?? category.defaultCostType ?? parent?.defaultCostType ?? null,
    necessity: override.necessity ?? category.defaultNecessity ?? parent?.defaultNecessity ?? null,
  };
}

/**
 * Subcategories always share their parent's color, so a category and its
 * subcategories read as one group in lists and charts.
 */
export function categoryColor(chosen: string | undefined, parent: Category | null): string {
  return parent?.color ?? chosen ?? CATEGORY_COLORS[0];
}

export const CATEGORY_COLORS = [
  "#2f5bd3",
  "#0f8a6a",
  "#c2372d",
  "#b26a00",
  "#7a4fd1",
  "#0f7d9c",
  "#c2457a",
  "#5c7a1f",
  "#8a5a3c",
  "#4b5563",
] as const;
