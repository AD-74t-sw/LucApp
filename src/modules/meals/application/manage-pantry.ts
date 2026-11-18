import { type Result, notFound, ok } from "@/shared/domain";
import { toBaseAmount } from "../domain/food";
import { foodRepository } from "../infrastructure/catalog-repository";
import type { AddStockInput, StockInput } from "./meal-schemas";

/** What was bought: adds to the food's stock. */
export async function addStock(userId: string, input: AddStockInput): Promise<Result<void>> {
  const food = await foodRepository.findById(userId, input.foodId);
  if (!food) return notFound("La comida");
  const amount = toBaseAmount(input.amount, input.unit, food);
  if (!amount.ok) return amount;
  await foodRepository.changeStock(userId, food.id, amount.value);
  return ok();
}

/** What is left, counted by hand ("Ajustar"). Zero empties it. */
export async function setStock(
  userId: string,
  foodId: string,
  input: StockInput,
): Promise<Result<void>> {
  const food = await foodRepository.findById(userId, foodId);
  if (!food) return notFound("La comida");
  const amount = toBaseAmount(input.amount, input.unit, food, { allowZero: true });
  if (!amount.ok) return amount;
  await foodRepository.setStock(userId, food.id, amount.value);
  return ok();
}
