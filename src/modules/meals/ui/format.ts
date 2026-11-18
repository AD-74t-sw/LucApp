import { LOCALE } from "@/shared/ui";
import {
  type AmountUnit,
  type Food,
  type FoodMeasure,
  type MeasureUnit,
  displayUnit,
  inUnit,
} from "../domain/food";
import type { MealStatus } from "../domain/meal";

export const AMOUNT_UNIT_LABELS: Record<AmountUnit, string> = {
  g: "gramos (g)",
  kg: "kilos (kg)",
  ml: "mililitros (ml)",
  l: "litros (l)",
  pieces: "unidades",
  servings: "porciones",
};

export const MEAL_STATUS_LABELS: Record<MealStatus, string> = {
  PLANNED: "Planificado",
  EATEN: "Comido",
};

const number = (value: number) =>
  new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(value);

/** A number as the person would type it back (decimal comma, no thousands dot). */
export function editableNumber(value: number): string {
  return String(Math.round(value * 100) / 100).replace(".", ",");
}

/** "1,5 kg", "800 g", "250 ml", "12 unidades". */
export function formatAmount(amount: number, measure: FoodMeasure): string {
  const unit = displayUnit(amount, measure);
  const value = inUnit(amount, unit);
  if (unit === "pieces") return `${number(value)} ${value === 1 ? "unidad" : "unidades"}`;
  return `${number(value)} ${unit}`;
}

export function formatServings(servings: number): string {
  return `${number(servings)} ${servings === 1 ? "porción" : "porciones"}`;
}

/** "1 porción = 150 g". */
export function formatServingSize(food: Pick<Food, "unitSize" | "measure">): string {
  return `1 porción = ${formatAmount(food.unitSize, food.measure)}`;
}

/** The serving size split into what the form shows: amount and unit. */
export function servingSizeFields(food: Pick<Food, "unitSize" | "measure">): {
  amount: string;
  unit: MeasureUnit;
} {
  const unit = displayUnit(food.unitSize, food.measure);
  return { amount: editableNumber(inUnit(food.unitSize, unit)), unit };
}
