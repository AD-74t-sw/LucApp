import { type Result, ok } from "@/shared/domain";
import type { MealSettings } from "../domain/settings";
import { mealSettingsRepository } from "../infrastructure/meal-repository";
import type { MealSettingsInput } from "./meal-schemas";

export async function saveMealSettings(
  userId: string,
  input: MealSettingsInput,
): Promise<Result<MealSettings>> {
  const settings = { coverageDays: input.coverageDays, shortageAlertTime: input.shortageAlertTime };
  await mealSettingsRepository.save(userId, settings);
  return ok(settings);
}
