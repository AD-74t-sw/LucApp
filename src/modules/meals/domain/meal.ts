import { type LocalDate, type Result, ok, validationError } from "@/shared/domain";
import { SERVINGS_RANGE, isValidServings } from "./block";
import { AMOUNT_DECIMALS, type Food, SERVING_DECIMALS, roundTo } from "./food";

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
    merged.set(
      item.foodId,
      roundTo((merged.get(item.foodId) ?? 0) + item.servings, SERVING_DECIMALS),
    );
  }
  return [...merged].map(([foodId, servings]) => ({ foodId, servings }));
}

export function validateItems(items: readonly MealItemInput[]): Result<void> {
  if (items.length === 0) {
    return validationError("Agrega al menos una comida.", "items");
  }
  if (items.some((i) => !isValidServings(i.servings))) {
    return validationError(SERVINGS_RANGE, "items");
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
    const taken = roundTo(Math.min(item.servings * food.unitSize, available), AMOUNT_DECIMALS);
    left.set(item.foodId, roundTo(available - taken, AMOUNT_DECIMALS));
    return { ...item, taken };
  });
}
