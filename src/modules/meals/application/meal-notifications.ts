import { DEFAULT_TIMEZONE, getProfile } from "@/modules/identity";
import { type PushPayload, notifyOnce, sentKeys, usersWithDevices } from "@/modules/notifications";
import { type LocalDate, timeIn, today } from "@/shared/domain";
import type { MealBlock } from "../domain/block";
import { type CategoryCoverage, shortages } from "../domain/coverage";
import type { Food, FoodCategory } from "../domain/food";
import type { Meal } from "../domain/meal";
import {
  dueMealReminders,
  isShortageAlertDue,
  mealReminderKey,
  mealReminderPrefix,
  shortageAlertKey,
} from "../domain/reminders";
import { mealRepository } from "../infrastructure/meal-repository";
import { getPantry, listBlocks } from "./meal-queries";

function mealPayload(
  block: MealBlock,
  meal: Meal | undefined,
  foods: readonly Food[],
  date: LocalDate,
): PushPayload {
  const names = new Map(foods.map((f) => [f.id, f.name]));
  const planned = (meal?.items ?? [])
    .map((i) => `${names.get(i.foodId) ?? "Comida"}${i.servings > 1 ? ` ×${i.servings}` : ""}`)
    .join(", ");
  return {
    title: `${block.name} · ${block.startTime}–${block.endTime}`,
    body: planned ? `Toca: ${planned}.` : "Aún no indicas qué comer. Toca para elegir.",
    url: `/meals?date=${date}`,
    tag: `meal-${block.id}`,
  };
}

function shortagePayload(
  missing: readonly CategoryCoverage[],
  categories: readonly FoodCategory[],
  days: number,
): PushPayload {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const list = missing
    .map((c) => `${names.get(c.categoryId) ?? "Categoría"} (faltan ${c.missing})`)
    .join(", ");
  return {
    title: "Falta comida en casa",
    body: `No alcanza para ${days} ${days === 1 ? "día" : "días"}: ${list}.`,
    url: "/meals/pantry",
    tag: "pantry",
  };
}

async function notifyUser(userId: string, now: Date): Promise<number> {
  const profile = await getProfile(userId);
  const timezone = profile?.settings?.timezone ?? DEFAULT_TIMEZONE;
  const date = today(timezone, now);
  const time = timeIn(timezone, now);
  let sent = 0;

  const [blocks, meals, alreadySent, pantry] = await Promise.all([
    listBlocks(userId),
    mealRepository.listBetween(userId, date, date),
    sentKeys(userId, mealReminderPrefix(date)),
    getPantry(userId),
  ]);
  for (const block of dueMealReminders({ blocks, meals, date, time, sentKeys: alreadySent })) {
    const meal = meals.find((m) => m.blockId === block.id);
    const outcome = await notifyOnce(
      userId,
      mealReminderKey(block.id, date),
      mealPayload(block, meal, pantry.foods, date),
    );
    if (outcome === "sent") sent += 1;
  }

  if (isShortageAlertDue(time, pantry.settings.shortageAlertTime)) {
    const missing = shortages(pantry.coverage);
    if (missing.length > 0) {
      const outcome = await notifyOnce(
        userId,
        shortageAlertKey(date),
        shortagePayload(missing, pantry.categories, pantry.settings.coverageDays),
      );
      if (outcome === "sent") sent += 1;
    }
  }
  return sent;
}

/**
 * Sends what is due now: block reminders and the daily "falta comida" alert.
 * Runs every minute (src/instrumentation.ts) and is safe to run more often or
 * concurrently: every notification is claimed once by key. Only users with a
 * device that accepted notifications are checked.
 */
export async function runMealNotifications(now: Date = new Date()): Promise<{ sent: number }> {
  let sent = 0;
  for (const userId of await usersWithDevices()) {
    try {
      sent += await notifyUser(userId, now);
    } catch (error) {
      // One user's broken data must not stop everyone else's reminders.
      console.error("[meals] notifications failed for a user", error);
    }
  }
  return { sent };
}
