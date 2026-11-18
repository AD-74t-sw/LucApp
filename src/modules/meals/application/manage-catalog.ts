import { type Result, conflict, notFound, ok } from "@/shared/domain";
import { type Food, type FoodCategory, measureOf, servingSize } from "../domain/food";
import { foodCategoryRepository, foodRepository } from "../infrastructure/catalog-repository";
import type { FoodCategoryInput, FoodInput } from "./meal-schemas";

const NAME_TAKEN_CATEGORY = "Ya tienes una categoría con ese nombre.";
const NAME_TAKEN_FOOD = "Ya tienes una comida con ese nombre.";

export async function createFoodCategory(
  userId: string,
  input: FoodCategoryInput,
): Promise<Result<FoodCategory>> {
  if (await foodCategoryRepository.existsWithName(userId, input.name)) {
    return conflict(NAME_TAKEN_CATEGORY, "name");
  }
  return ok(await foodCategoryRepository.create(userId, input.name));
}

export async function renameFoodCategory(
  userId: string,
  id: string,
  input: FoodCategoryInput,
): Promise<Result<void>> {
  if (!(await foodCategoryRepository.findById(userId, id))) return notFound("La categoría");
  if (await foodCategoryRepository.existsWithName(userId, input.name, id)) {
    return conflict(NAME_TAKEN_CATEGORY, "name");
  }
  await foodCategoryRepository.rename(userId, id, input.name);
  return ok();
}

/** Archived categories leave forms, blocks' needs and the pantry check, but keep their foods. */
export async function setFoodCategoryArchived(
  userId: string,
  id: string,
  archived: boolean,
): Promise<Result<void>> {
  if (!(await foodCategoryRepository.findById(userId, id))) return notFound("La categoría");
  await foodCategoryRepository.setArchived(userId, id, archived);
  return ok();
}

export async function deleteFoodCategory(userId: string, id: string): Promise<Result<void>> {
  if (!(await foodCategoryRepository.findById(userId, id))) return notFound("La categoría");
  if ((await foodCategoryRepository.delete(userId, id)) === "in_use") {
    return conflict(
      "La categoría tiene comidas o la usa un bloque. Archívala en lugar de eliminarla.",
    );
  }
  return ok();
}

async function foodData(userId: string, input: FoodInput, exceptId?: string) {
  const category = await foodCategoryRepository.findById(userId, input.categoryId);
  if (!category) return notFound("La categoría");
  if (await foodRepository.existsWithName(userId, input.name, exceptId)) {
    return conflict(NAME_TAKEN_FOOD, "name");
  }
  const unitSize = servingSize(input.unitAmount, input.unit);
  if (!unitSize.ok) return unitSize;
  return ok({
    categoryId: input.categoryId,
    name: input.name,
    icon: input.icon ?? null,
    measure: measureOf(input.unit),
    unitLabel: input.unit === "custom" ? (input.unitLabel ?? null) : null,
    unitSize: unitSize.value,
  });
}

export async function createFood(userId: string, input: FoodInput): Promise<Result<Food>> {
  const data = await foodData(userId, input);
  if (!data.ok) return data;
  return ok(await foodRepository.create(userId, { ...data.value, stock: 0 }));
}

/**
 * Updates a food. Switching between weight, volume and units empties its
 * stock: grams of something cannot become milliliters.
 */
export async function updateFood(
  userId: string,
  id: string,
  input: FoodInput,
): Promise<Result<void>> {
  const current = await foodRepository.findById(userId, id);
  if (!current) return notFound("La comida");
  const data = await foodData(userId, input, id);
  if (!data.ok) return data;
  await foodRepository.update(userId, id, {
    ...data.value,
    ...(data.value.measure !== current.measure ? { stock: 0 } : {}),
  });
  return ok();
}

export async function setFoodArchived(
  userId: string,
  id: string,
  archived: boolean,
): Promise<Result<void>> {
  if (!(await foodRepository.findById(userId, id))) return notFound("La comida");
  await foodRepository.setArchived(userId, id, archived);
  return ok();
}

export async function deleteFood(userId: string, id: string): Promise<Result<void>> {
  if (!(await foodRepository.findById(userId, id))) return notFound("La comida");
  if ((await foodRepository.delete(userId, id)) === "in_use") {
    return conflict("La comida aparece en comidas registradas. Archívala en lugar de eliminarla.");
  }
  return ok();
}
