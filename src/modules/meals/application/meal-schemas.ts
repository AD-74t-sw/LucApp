import { z } from "zod";
import {
  checkbox,
  choice,
  id,
  integer,
  localDate,
  localTime,
  optionalChoice,
  optionalText,
  text,
} from "@/shared/application/fields";
import { SERVINGS_RANGE, isValidServings } from "../domain/block";
import { AMOUNT_UNITS, SERVING_DECIMALS, parseQuantity, roundTo } from "../domain/food";
import { FOOD_ICON_KEYS } from "../domain/food-icons";
import { MAX_COVERAGE_DAYS } from "../domain/settings";

/** Units a serving can be measured in; "custom" is a unit the person names. */
export const MEASURE_UNITS = ["g", "kg", "ml", "l", "pieces", "custom"] as const;

const quantity = (message: string) => z.string({ error: message }).trim().min(1, message);

/** Servings as typed: "1", "1,5", "0.5". Kept with 2 decimals. */
const servings = () =>
  z
    .preprocess(
      (value) => (typeof value === "string" ? (parseQuantity(value) ?? Number.NaN) : value),
      z.number({ error: "Ingresa un número (puede tener decimales)." }),
    )
    .refine(isValidServings, SERVINGS_RANGE)
    .transform((value) => roundTo(value, SERVING_DECIMALS));

export const foodCategorySchema = z.object({ name: text(60) });
export type FoodCategoryInput = z.infer<typeof foodCategorySchema>;

export const foodSchema = z
  .object({
    name: text(60),
    categoryId: id("Elige una categoría."),
    icon: optionalChoice(FOOD_ICON_KEYS),
    /** How much one serving is, in `unit` ("150" g, "1" l, "0,5" units, "1" taza). */
    unitAmount: quantity("Indica cuánto es una porción."),
    unit: choice(MEASURE_UNITS),
    /** With unit "custom": its name ("taza", "plato"). */
    unitLabel: optionalText(30),
  })
  .superRefine((input, ctx) => {
    if (input.unit === "custom" && !input.unitLabel) {
      ctx.addIssue({
        code: "custom",
        path: ["unitLabel"],
        message: "Escribe la unidad: taza, plato, rebanada…",
      });
    }
  });
export type FoodInput = z.infer<typeof foodSchema>;

/** Adding what was bought (or setting what is left), in servings or a measure. */
export const stockSchema = z.object({
  amount: quantity("Ingresa una cantidad."),
  unit: choice(AMOUNT_UNITS),
});
export type StockInput = z.infer<typeof stockSchema>;

export const addStockSchema = stockSchema.extend({ foodId: id("Elige una comida.") });
export type AddStockInput = z.infer<typeof addStockSchema>;

export const portionSchema = z.object({
  categoryId: id(),
  servings: servings(),
});

export const blockSchema = z.object({
  name: text(60),
  startTime: localTime(),
  endTime: localTime(),
  notify: checkbox(),
  portions: z.array(portionSchema),
});
export type BlockInput = z.infer<typeof blockSchema>;

export const mealItemSchema = z.object({
  foodId: id("Elige una comida."),
  servings: servings(),
});
export const mealItemsSchema = z.array(mealItemSchema);

/** The block and day a meal belongs to. */
export const mealTargetSchema = z.object({ blockId: id(), date: localDate() });
export type MealTarget = z.infer<typeof mealTargetSchema>;

export const mealSettingsSchema = z.object({
  coverageDays: integer(1, MAX_COVERAGE_DAYS),
  shortageAlertTime: localTime(),
});
export type MealSettingsInput = z.infer<typeof mealSettingsSchema>;
