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
  custom: "Otro…",
  servings: "porciones",
};

export const MEAL_STATUS_LABELS: Record<MealStatus, string> = {
  PLANNED: "Planificado",
  EATEN: "Comido",
};

/** "1,5", "12", "0,25": up to 2 decimals, Chilean format. */
export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits }).format(value);
}

/** A number as the person would type it back (decimal comma, no thousands dot). */
export function editableNumber(value: number): string {
  return String(Math.round(value * 1000) / 1000).replace(".", ",");
}

/** Spanish plural of a unit the person named: taza → tazas, porción → porciones, pan → panes. */
export function pluralize(word: string): string {
  const text = word.trim();
  if (text === "" || /s$/i.test(text)) return text;
  if (/ión$/i.test(text)) return `${text.slice(0, -3)}iones`;
  if (/z$/i.test(text)) return `${text.slice(0, -1)}ces`;
  if (/[aeiouáéó]$/i.test(text)) return `${text}s`;
  return `${text}es`;
}

/** Name of the unit a COUNT food is counted in, for `amount` of it. */
export function countUnit(amount: number, unitLabel: string | null): string {
  if (!unitLabel) return amount === 1 ? "unidad" : "unidades";
  return amount === 1 ? unitLabel : pluralize(unitLabel);
}

/** "1,5 kg", "800 g", "250 ml", "12 unidades", "2 tazas". */
export function formatAmount(
  amount: number,
  measure: FoodMeasure,
  unitLabel: string | null = null,
): string {
  const unit = displayUnit(amount, measure);
  const value = inUnit(amount, unit);
  if (unit === "pieces") return `${formatNumber(value, 3)} ${countUnit(value, unitLabel)}`;
  return `${formatNumber(value, 3)} ${unit}`;
}

export function formatServings(servings: number): string {
  return `${formatNumber(servings)} ${servings === 1 ? "porción" : "porciones"}`;
}

/** "1 porción = 150 g", "1 porción = 1 taza". */
export function formatServingSize(food: Pick<Food, "unitSize" | "measure" | "unitLabel">): string {
  return `1 porción = ${formatAmount(food.unitSize, food.measure, food.unitLabel)}`;
}

/** Label of an amount unit for a given food (its own unit's name instead of "unidades"). */
export function amountUnitLabel(unit: AmountUnit, food: Pick<Food, "unitLabel"> | undefined) {
  if (unit === "pieces" && food?.unitLabel) return pluralize(food.unitLabel);
  return AMOUNT_UNIT_LABELS[unit];
}

/** The serving size split into what the food form shows: amount, unit and custom name. */
export function servingSizeFields(food: Pick<Food, "unitSize" | "measure" | "unitLabel">): {
  amount: string;
  unit: MeasureUnit;
  label: string;
} {
  if (food.unitLabel) {
    return { amount: editableNumber(food.unitSize), unit: "custom", label: food.unitLabel };
  }
  const unit = displayUnit(food.unitSize, food.measure);
  return { amount: editableNumber(inUnit(food.unitSize, unit)), unit, label: "" };
}
