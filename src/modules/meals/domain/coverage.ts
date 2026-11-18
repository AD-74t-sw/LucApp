import type { MealBlock } from "./block";
import { type Food, type FoodCategory, servingsIn } from "./food";

/** How well the pantry covers one food category for the next days. */
export type CategoryCoverage = Readonly<{
  categoryId: string;
  /** Whole servings at home, across the category's foods. */
  available: number;
  /** Servings the active blocks ask for each day. */
  perDay: number;
  /** Servings needed for the coverage window (perDay × days). */
  needed: number;
  /** Servings short of `needed` (0 when covered). */
  missing: number;
}>;

/**
 * Coverage of every active category that a block uses. A category no block
 * asks for is never "missing", however empty the pantry is.
 */
export function coverage(
  categories: readonly FoodCategory[],
  foods: readonly Food[],
  blocks: readonly MealBlock[],
  days: number,
): CategoryCoverage[] {
  return categories
    .filter((category) => !category.archived)
    .map((category) => {
      const perDay = blocks
        .filter((block) => !block.archived)
        .flatMap((block) => block.portions)
        .filter((portion) => portion.categoryId === category.id)
        .reduce((sum, portion) => sum + portion.servings, 0);
      const available = foods
        .filter((food) => food.categoryId === category.id && !food.archived)
        .reduce((sum, food) => sum + servingsIn(food), 0);
      const needed = perDay * days;
      return {
        categoryId: category.id,
        available,
        perDay,
        needed,
        missing: Math.max(0, needed - available),
      };
    });
}

export function shortages(items: readonly CategoryCoverage[]): CategoryCoverage[] {
  return items.filter((item) => item.missing > 0);
}
