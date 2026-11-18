import {
  type LocalDate,
  type Result,
  conflict,
  notFound,
  ok,
  validationError,
} from "@/shared/domain";
import { type Db, runInTransaction } from "@/shared/infrastructure";
import { type MealItemInput, mergeItems, takeFromPantry, validateItems } from "../domain/meal";
import { blockRepository } from "../infrastructure/block-repository";
import { foodRepository } from "../infrastructure/catalog-repository";
import { mealRepository } from "../infrastructure/meal-repository";
import type { MealTarget } from "./meal-schemas";

const ALREADY_EATEN = "Esta comida ya está marcada como comida. Deshazla para cambiarla.";

/** Validated, merged items whose foods all belong to the user. */
async function checkItems(
  userId: string,
  items: readonly MealItemInput[],
  db?: Db,
): Promise<Result<MealItemInput[]>> {
  const merged = mergeItems(items);
  const valid = validateItems(merged);
  if (!valid.ok) return valid;
  const foods = await foodRepository.findMany(
    userId,
    merged.map((i) => i.foodId),
    db,
  );
  if (foods.length !== merged.length) return notFound("Una de las comidas");
  return ok(merged);
}

async function checkBlock(userId: string, target: MealTarget): Promise<Result<void>> {
  return (await blockRepository.findById(userId, target.blockId)) ? ok() : notFound("El bloque");
}

/**
 * Decides ahead what a block will be (tomorrow's lunch is already cooked).
 * Planning does not touch the pantry; eating does.
 */
export async function planMeal(
  userId: string,
  target: MealTarget,
  items: readonly MealItemInput[],
): Promise<Result<void>> {
  const block = await checkBlock(userId, target);
  if (!block.ok) return block;
  const checked = await checkItems(userId, items);
  if (!checked.ok) return checked;
  return runInTransaction(async (tx) => {
    const current = await mealRepository.find(userId, target.blockId, target.date, tx);
    if (current?.status === "EATEN") return conflict(ALREADY_EATEN);
    await mealRepository.save(
      userId,
      target.blockId,
      target.date,
      {
        status: "PLANNED",
        eatenAt: null,
        items: checked.value.map((i) => ({ ...i, taken: 0 })),
      },
      tx,
    );
    return ok();
  });
}

/** Forgets the plan of a block that was not eaten. */
export async function clearPlan(userId: string, target: MealTarget): Promise<Result<void>> {
  const current = await mealRepository.find(userId, target.blockId, target.date);
  if (!current) return ok();
  if (current.status === "EATEN") return conflict(ALREADY_EATEN);
  await mealRepository.remove(userId, target.blockId, target.date);
  return ok();
}

/**
 * Marks a block as eaten and takes its foods out of the pantry.
 * Without `items` it is what was planned; with them ("Comí otra cosa", or no
 * plan) they replace the plan.
 */
export async function eatMeal(
  userId: string,
  target: MealTarget,
  items: readonly MealItemInput[] | undefined,
  today: LocalDate,
): Promise<Result<void>> {
  if (target.date > today) {
    return validationError("No puedes marcar como comido un día que aún no llega.");
  }
  const block = await checkBlock(userId, target);
  if (!block.ok) return block;
  return runInTransaction(async (tx) => {
    const current = await mealRepository.find(userId, target.blockId, target.date, tx);
    if (current?.status === "EATEN") return conflict(ALREADY_EATEN);
    const chosen = items ?? current?.items;
    if (!chosen || chosen.length === 0) {
      return validationError("Indica qué comiste.", "items");
    }
    const checked = await checkItems(userId, chosen, tx);
    if (!checked.ok) return checked;
    const foods = await foodRepository.findMany(
      userId,
      checked.value.map((i) => i.foodId),
      tx,
    );
    const eaten = takeFromPantry(checked.value, new Map(foods.map((f) => [f.id, f])));
    for (const item of eaten) {
      await foodRepository.changeStock(userId, item.foodId, -item.taken, tx);
    }
    await mealRepository.save(
      userId,
      target.blockId,
      target.date,
      { status: "EATEN", eatenAt: new Date(), items: eaten },
      tx,
    );
    return ok();
  });
}

/** Back to planned: what was taken from the pantry goes back. */
export async function undoMeal(userId: string, target: MealTarget): Promise<Result<void>> {
  return runInTransaction(async (tx) => {
    const current = await mealRepository.find(userId, target.blockId, target.date, tx);
    if (!current) return notFound("La comida");
    if (current.status !== "EATEN") return ok();
    for (const item of current.items) {
      await foodRepository.changeStock(userId, item.foodId, item.taken, tx);
    }
    await mealRepository.save(
      userId,
      target.blockId,
      target.date,
      {
        status: "PLANNED",
        eatenAt: null,
        items: current.items.map((i) => ({ ...i, taken: 0 })),
      },
      tx,
    );
    return ok();
  });
}
