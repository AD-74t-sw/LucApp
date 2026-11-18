import type { LocalTime } from "@/shared/domain";

export type MealSettings = Readonly<{
  /** Warn when the pantry does not cover this many days of blocks. */
  coverageDays: number;
  /** Earliest time of the daily "falta comida" notification. */
  shortageAlertTime: LocalTime;
}>;

export const DEFAULT_MEAL_SETTINGS: MealSettings = {
  coverageDays: 3,
  shortageAlertTime: "10:00" as LocalTime,
};

export const MAX_COVERAGE_DAYS = 30;
