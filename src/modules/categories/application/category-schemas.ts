import { z } from "zod";
import { choice, optionalChoice, optionalId, text } from "@/shared/application/fields";
import { CATEGORY_KINDS, COST_TYPES, NECESSITIES } from "../domain/category";

const baseFields = {
  name: text(60),
  /** Ignored for subcategories: they take their parent's color. */
  color: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Color inválido.")
      .optional(),
  ),
  parentId: optionalId(),
  defaultCostType: optionalChoice(COST_TYPES),
  defaultNecessity: optionalChoice(NECESSITIES),
};

export const createCategorySchema = z.object({ ...baseFields, kind: choice(CATEGORY_KINDS) });
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/** The kind (expense/income) cannot change after creation. */
export const updateCategorySchema = z.object(baseFields);
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
