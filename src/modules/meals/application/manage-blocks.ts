import { type Result, conflict, notFound, ok } from "@/shared/domain";
import { type MealBlock, validateBlock } from "../domain/block";
import { blockRepository } from "../infrastructure/block-repository";
import { foodCategoryRepository } from "../infrastructure/catalog-repository";
import type { BlockInput } from "./meal-schemas";

async function validate(userId: string, input: BlockInput): Promise<Result<void>> {
  const valid = validateBlock(input);
  if (!valid.ok) return valid;
  const ids = input.portions.map((p) => p.categoryId);
  if ((await foodCategoryRepository.countActive(userId, ids)) !== new Set(ids).size) {
    return notFound("Una de las categorías");
  }
  return ok();
}

const data = (input: BlockInput) => ({
  name: input.name,
  startTime: input.startTime,
  endTime: input.endTime,
  notify: input.notify,
});

export async function createBlock(userId: string, input: BlockInput): Promise<Result<MealBlock>> {
  const valid = await validate(userId, input);
  if (!valid.ok) return valid;
  return ok(await blockRepository.create(userId, data(input), input.portions));
}

export async function updateBlock(
  userId: string,
  id: string,
  input: BlockInput,
): Promise<Result<void>> {
  if (!(await blockRepository.findById(userId, id))) return notFound("El bloque");
  const valid = await validate(userId, input);
  if (!valid.ok) return valid;
  await blockRepository.update(userId, id, data(input), input.portions);
  return ok();
}

/** Archived blocks stop showing up, notifying and counting for the pantry; their meals stay. */
export async function setBlockArchived(
  userId: string,
  id: string,
  archived: boolean,
): Promise<Result<void>> {
  if (!(await blockRepository.findById(userId, id))) return notFound("El bloque");
  await blockRepository.setArchived(userId, id, archived);
  return ok();
}

export async function deleteBlock(userId: string, id: string): Promise<Result<void>> {
  if (!(await blockRepository.findById(userId, id))) return notFound("El bloque");
  if ((await blockRepository.delete(userId, id)) === "in_use") {
    return conflict("El bloque tiene comidas registradas. Archívalo en lugar de eliminarlo.");
  }
  return ok();
}
