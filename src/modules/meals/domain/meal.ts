import { type LocalDate, type Result, ok, validationError } from "@/shared/domain";
import { MAX_SERVINGS } from "./block";
import type { Food } from "./food";

/**
 * A block on a given day. It can be planned ahead (what will be eaten) and
 * then marked as eaten, which takes its foods out of the pantry.
 */
export const MEAL_STATUSES = ["PLANNED", "EATEN"] as const;
export type MealStatus = (typeof MEAL_STATUSES)[number];

export type MealItemInput = Readonly<{ foodId: string; servings: number }>;

export type MealItem = MealItemInput &
  Readonly<{
    /** Base amount taken out of the pantry when eaten (0 while planned). */
    taken: number;
  }>;

export type Meal = Readonly<{
  id: string;
  blockId: string;
  date: LocalDate;
  status: MealStatus;
  eatenAt: Date | null;
  items: readonly MealItem[];
}>;

/** The same food twice becomes one item with the servings added, keeping the first one's place. */
export function mergeItems(items: readonly MealItemInput[]): MealItemInput[] {
  const merged = new Map<string, number>();
  for (const item of items) {
    merged.set(item.foodId, (merged.get(item.foodId) ?? 0) + item.servings);
  }
  return [...merged].map(([foodId, servings]) => ({ foodId, servings }));
}

export function validateItems(items: readonly MealItemInput[]): Result<void> {
  if (items.length === 0) {
    return validationError("Agrega al menos una comida.", "items");
  }
  if (items.some((i) => i.servings < 1 || i.servings > MAX_SERVINGS)) {
    return validationError(`Las porciones van de 1 a ${MAX_SERVINGS}.`, "items");
  }
  return ok();
}

/**
 * What eating these items takes out of the pantry: each item's servings in
 * the food's base measure, or whatever is left if the pantry has less (it
 * never goes below zero, and undoing gives back exactly what was taken).
 */
export function takeFromPantry(
  items: readonly MealItemInput[],
  foods: ReadonlyMap<string, Pick<Food, "unitSize" | "stock">>,
): MealItem[] {
  const left = new Map([...foods].map(([id, food]) => [id, food.stock]));
  return items.map((item) => {
    const food = foods.get(item.foodId);
    if (!food) return { ...item, taken: 0 };
    const available = left.get(item.foodId) ?? 0;
    const taken = Math.min(item.servings * food.unitSize, available);
    left.set(item.foodId, available - taken);
    return { ...item, taken };
  });
}
