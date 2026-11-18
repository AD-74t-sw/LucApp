import type { LocalDate } from "@/shared/domain";
import { type MealBlock, sortBlocks } from "../domain/block";
import { type CategoryCoverage, coverage, shortages } from "../domain/coverage";
import type { Food, FoodCategory } from "../domain/food";
import type { Meal } from "../domain/meal";
import { DEFAULT_MEAL_SETTINGS, type MealSettings } from "../domain/settings";
import { blockRepository } from "../infrastructure/block-repository";
import { foodCategoryRepository, foodRepository } from "../infrastructure/catalog-repository";
import { mealRepository, mealSettingsRepository } from "../infrastructure/meal-repository";

export function listFoodCategories(
  userId: string,
  options: { includeArchived?: boolean } = {},
): Promise<FoodCategory[]> {
  return foodCategoryRepository.list(userId, options);
}

export function listFoods(
  userId: string,
  options: { includeArchived?: boolean } = {},
): Promise<Food[]> {
  return foodRepository.list(userId, options);
}

export async function listBlocks(
  userId: string,
  options: { includeArchived?: boolean } = {},
): Promise<MealBlock[]> {
  return sortBlocks(await blockRepository.list(userId, options));
}

export async function getMealSettings(userId: string): Promise<MealSettings> {
  return (await mealSettingsRepository.find(userId)) ?? DEFAULT_MEAL_SETTINGS;
}

/** The day's blocks in order, with what was planned or eaten in each. */
export async function getDay(
  userId: string,
  date: LocalDate,
): Promise<{ blocks: MealBlock[]; meals: Meal[] }> {
  const [blocks, meals] = await Promise.all([
    listBlocks(userId),
    mealRepository.listBetween(userId, date, date),
  ]);
  return { blocks, meals };
}

export type PantryOverview = {
  settings: MealSettings;
  categories: FoodCategory[];
  foods: Food[];
  coverage: CategoryCoverage[];
};

/** What is at home, and whether it lasts for the next `coverageDays` of blocks. */
export async function getPantry(userId: string): Promise<PantryOverview> {
  const [settings, categories, foods, blocks] = await Promise.all([
    getMealSettings(userId),
    listFoodCategories(userId),
    listFoods(userId),
    blockRepository.list(userId),
  ]);
  return {
    settings,
    categories,
    foods,
    coverage: coverage(categories, foods, blocks, settings.coverageDays),
  };
}

/** Categories that will not last (badge on "Despensa", banner on "Hoy"). */
export async function getShortages(userId: string): Promise<CategoryCoverage[]> {
  return shortages((await getPantry(userId)).coverage);
}
