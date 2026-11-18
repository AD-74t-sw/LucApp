import type { CategoryKind, CostType, Necessity } from "../domain/category";

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  EXPENSE: "Gasto",
  INCOME: "Ingreso",
};

export const COST_TYPE_LABELS: Record<CostType, string> = {
  FIXED: "Fijo",
  VARIABLE: "Variable",
};

export const NECESSITY_LABELS: Record<Necessity, string> = {
  ESSENTIAL: "Necesario",
  DISCRETIONARY: "Prescindible",
};
