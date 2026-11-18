import type { LocalDate, LocalTime } from "@/shared/domain";
import { type MealBlock, isActiveAt } from "./block";
import type { Meal } from "./meal";

/**
 * Blocks to remind about now: those that notify, are going on and were not
 * eaten yet. Checking "going on" (not "starts this minute") means a reminder
 * missed while the server was down still goes out before the block ends;
 * `sentKeys` keeps each one from going out twice.
 */
export function dueMealReminders(input: {
  blocks: readonly MealBlock[];
  meals: readonly Meal[];
  date: LocalDate;
  time: LocalTime;
  sentKeys: ReadonlySet<string>;
}): MealBlock[] {
  const eaten = new Set(
    input.meals.filter((m) => m.date === input.date && m.status === "EATEN").map((m) => m.blockId),
  );
  return input.blocks.filter(
    (block) =>
      block.notify &&
      !block.archived &&
      isActiveAt(block, input.time) &&
      !eaten.has(block.id) &&
      !input.sentKeys.has(mealReminderKey(block.id, input.date)),
  );
}

/** Date first, so one day's keys share a prefix ("meal:2026-11-18:"). */
export function mealReminderKey(blockId: string, date: LocalDate): string {
  return `${mealReminderPrefix(date)}${blockId}`;
}

export function mealReminderPrefix(date: LocalDate): string {
  return `meal:${date}:`;
}

/** One "falta comida" notification a day, not before the time the person chose. */
export function shortageAlertKey(date: LocalDate): string {
  return `pantry:${date}`;
}

export function isShortageAlertDue(time: LocalTime, alertTime: LocalTime): boolean {
  return time >= alertTime;
}
