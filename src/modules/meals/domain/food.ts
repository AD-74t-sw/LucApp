import { type Result, ok, validationError } from "@/shared/domain";
import type { FoodIconKey } from "./food-icons";

/**
 * Foods are counted in servings ("unidades"): each food says how much one
 * serving is, in its base measure. Stock is kept in that base measure, so
 * "1 kg de arroz" with 80 g servings is 1000 g = 12 servings.
 */
export const FOOD_MEASURES = ["MASS", "VOLUME", "COUNT"] as const;
export type FoodMeasure = (typeof FOOD_MEASURES)[number];

/** Units an amount can be typed in. "servings" is the food's own serving size. */
export const AMOUNT_UNITS = ["g", "kg", "ml", "l", "pieces", "servings"] as const;
export type AmountUnit = (typeof AMOUNT_UNITS)[number];
export type MeasureUnit = Exclude<AmountUnit, "servings">;

export const UNITS_BY_MEASURE: Record<FoodMeasure, readonly MeasureUnit[]> = {
  MASS: ["g", "kg"],
  VOLUME: ["ml", "l"],
  COUNT: ["pieces"],
};

/** Base measure of each unit: grams, milliliters or pieces. */
const UNIT_FACTOR: Record<MeasureUnit, number> = { g: 1, kg: 1000, ml: 1, l: 1000, pieces: 1 };

export function measureOf(unit: MeasureUnit): FoodMeasure {
  return unit === "g" || unit === "kg"
    ? "MASS"
    : unit === "ml" || unit === "l"
      ? "VOLUME"
      : "COUNT";
}

export type FoodCategory = Readonly<{ id: string; name: string; archived: boolean }>;

export type Food = Readonly<{
  id: string;
  categoryId: string;
  name: string;
  icon: FoodIconKey | null;
  measure: FoodMeasure;
  /** One serving, in the base measure. */
  unitSize: number;
  /** At home, in the base measure. */
  stock: number;
  archived: boolean;
}>;

/** Upper bound for any amount in the base measure (1 ton / 1000 l / a million pieces). */
const MAX_BASE_AMOUNT = 1_000_000;

/**
 * Number typed by a person: "1,5", "1.5", "250" or "1.000" (thousands).
 * Returns null when it is not a number.
 */
export function parseQuantity(input: string): number | null {
  const text = input.trim().replace(/\s/g, "");
  if (!/^\d[\d.,]*$/.test(text)) return null;
  let normalized: string;
  if (text.includes(",")) normalized = text.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(text)) normalized = text.replace(/\./g, "");
  else normalized = text;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Converts what the person typed (in grams, kilos, liters, pieces or the
 * food's servings) to the food's base measure, rounded to a whole unit.
 */
export function toBaseAmount(
  input: string,
  unit: AmountUnit,
  food: Pick<Food, "measure" | "unitSize">,
  options: { allowZero?: boolean; field?: string } = {},
): Result<number> {
  const field = options.field ?? "amount";
  const value = parseQuantity(input);
  if (value === null) return validationError("Ingresa una cantidad válida.", field);
  if (unit !== "servings" && measureOf(unit) !== food.measure) {
    return validationError("Esa unidad no corresponde a esta comida.", "unit");
  }
  const base = Math.round(value * (unit === "servings" ? food.unitSize : UNIT_FACTOR[unit]));
  if (base < 0 || (base === 0 && !options.allowZero) || (base === 0 && value > 0)) {
    return validationError("La cantidad debe ser mayor que cero.", field);
  }
  if (base > MAX_BASE_AMOUNT) return validationError("La cantidad es demasiado grande.", field);
  return ok(base);
}

/** Size of one serving from what the person typed ("150" g, "1" l…). */
export function servingSize(input: string, unit: MeasureUnit): Result<number> {
  return toBaseAmount(
    input,
    unit,
    { measure: measureOf(unit), unitSize: 1 },
    { field: "unitAmount" },
  );
}

/** Whole servings the food's stock covers. */
export function servingsIn(food: Pick<Food, "stock" | "unitSize">): number {
  return food.unitSize > 0 ? Math.floor(food.stock / food.unitSize) : 0;
}

/** Best unit to show a base amount in: kilos and liters from 1000 up. */
export function displayUnit(amount: number, measure: FoodMeasure): MeasureUnit {
  if (measure === "COUNT") return "pieces";
  const big = Math.abs(amount) >= 1000;
  return measure === "MASS" ? (big ? "kg" : "g") : big ? "l" : "ml";
}

/** A base amount expressed in `unit` (1500 g in kg = 1.5). */
export function inUnit(amount: number, unit: MeasureUnit): number {
  return amount / UNIT_FACTOR[unit];
}
