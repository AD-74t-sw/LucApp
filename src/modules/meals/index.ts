// Public server API of the meals module.
export type { BlockPortion, MealBlock } from "./domain/block";
export type { CategoryCoverage } from "./domain/coverage";
export type { Food, FoodCategory, FoodMeasure } from "./domain/food";
export type { FoodIconKey } from "./domain/food-icons";
export type { Meal, MealItem, MealStatus } from "./domain/meal";
export type { MealSettings } from "./domain/settings";
export {
  getDay,
  getMealSettings,
  getPantry,
  getShortages,
  listBlocks,
  listFoodCategories,
  listFoods,
  type PantryOverview,
} from "./application/meal-queries";
export { runMealNotifications } from "./application/meal-notifications";
