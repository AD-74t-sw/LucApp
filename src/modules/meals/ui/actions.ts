"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/modules/identity";
import { type Result, today } from "@/shared/domain";
import type { ActionState, FieldErrors } from "@/shared/ui/action-state";
import { errorState, formRows, parseForm, successState } from "@/shared/ui/server/form";
import {
  createBlock,
  deleteBlock,
  setBlockArchived,
  updateBlock,
} from "../application/manage-blocks";
import {
  createFood,
  createFoodCategory,
  deleteFood,
  deleteFoodCategory,
  renameFoodCategory,
  setFoodArchived,
  setFoodCategoryArchived,
  updateFood,
} from "../application/manage-catalog";
import { clearPlan, eatMeal, planMeal, undoMeal } from "../application/manage-meals";
import { addStock, setStock } from "../application/manage-pantry";
import { saveMealSettings } from "../application/manage-settings";
import {
  type MealTarget,
  addStockSchema,
  blockSchema,
  foodCategorySchema,
  foodSchema,
  mealItemsSchema,
  mealSettingsSchema,
  mealTargetSchema,
  portionSchema,
  stockSchema,
} from "../application/meal-schemas";
import { SERVINGS_RANGE } from "../domain/block";
import { parseQuantity } from "../domain/food";

const uuid = z.uuid();

/** Every meals screen and the bottom bar's badge read the same data. */
function done(message: string): ActionState {
  revalidatePath("/", "layout");
  return successState(message);
}

function outcome(result: Result<unknown>, message: string): ActionState {
  return result.ok ? done(message) : errorState(result.error);
}

function invalid(message: string, fieldErrors: FieldErrors = {}): ActionState {
  return { status: "error", message, fieldErrors };
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export async function createFoodCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(foodCategorySchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  return outcome(await createFoodCategory(user.id, parsed.value), "Categoría creada.");
}

export async function renameFoodCategoryAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(foodCategorySchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  return outcome(
    await renameFoodCategory(user.id, uuid.parse(id), parsed.value),
    "Categoría guardada.",
  );
}

export async function toggleFoodCategoryArchivedAction(
  id: string,
  archived: boolean,
  _prev: ActionState,
): Promise<ActionState> {
  const user = await requireUser();
  return outcome(
    await setFoodCategoryArchived(user.id, uuid.parse(id), archived),
    archived ? "Categoría archivada." : "Categoría restaurada.",
  );
}

export async function deleteFoodCategoryAction(id: string, _prev: ActionState) {
  const user = await requireUser();
  return outcome(await deleteFoodCategory(user.id, uuid.parse(id)), "Categoría eliminada.");
}

export async function createFoodAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(foodSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  return outcome(await createFood(user.id, parsed.value), "Comida creada.");
}

export async function updateFoodAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(foodSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  return outcome(await updateFood(user.id, uuid.parse(id), parsed.value), "Comida guardada.");
}

export async function toggleFoodArchivedAction(
  id: string,
  archived: boolean,
  _prev: ActionState,
): Promise<ActionState> {
  const user = await requireUser();
  return outcome(
    await setFoodArchived(user.id, uuid.parse(id), archived),
    archived ? "Comida archivada." : "Comida restaurada.",
  );
}

export async function deleteFoodAction(id: string, _prev: ActionState) {
  const user = await requireUser();
  return outcome(await deleteFood(user.id, uuid.parse(id)), "Comida eliminada.");
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/** Servings per category come as `servings.<categoryId>`; empty or 0 means "not in this block". */
function parseBlock(formData: FormData) {
  const parsed = parseForm(blockSchema.omit({ portions: true }), formData);
  const raw = [...formData.entries()]
    .filter(([key]) => key.startsWith("servings."))
    .map(([key, value]) => ({ categoryId: key.slice("servings.".length), servings: String(value) }))
    // Blank or zero ("0", "0,0") means the category is not in this block.
    .filter((p) => p.servings.trim() !== "" && parseQuantity(p.servings) !== 0);
  const portions = z.array(portionSchema).safeParse(raw);
  if (!parsed.ok || !portions.success) {
    const fieldErrors = parsed.ok
      ? {}
      : parsed.error.status === "error"
        ? parsed.error.fieldErrors
        : {};
    if (!portions.success) fieldErrors["portions"] = SERVINGS_RANGE;
    return { ok: false as const, error: invalid("Revisa los campos marcados.", fieldErrors) };
  }
  return { ok: true as const, value: { ...parsed.value, portions: portions.data } };
}

export async function createBlockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseBlock(formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  return outcome(await createBlock(user.id, parsed.value), "Bloque creado.");
}

export async function updateBlockAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseBlock(formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  return outcome(await updateBlock(user.id, uuid.parse(id), parsed.value), "Bloque guardado.");
}

export async function toggleBlockArchivedAction(
  id: string,
  archived: boolean,
  _prev: ActionState,
): Promise<ActionState> {
  const user = await requireUser();
  return outcome(
    await setBlockArchived(user.id, uuid.parse(id), archived),
    archived ? "Bloque archivado." : "Bloque restaurado.",
  );
}

export async function deleteBlockAction(id: string, _prev: ActionState) {
  const user = await requireUser();
  return outcome(await deleteBlock(user.id, uuid.parse(id)), "Bloque eliminado.");
}

// ---------------------------------------------------------------------------
// Pantry
// ---------------------------------------------------------------------------

export async function addStockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(addStockSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  return outcome(await addStock(user.id, parsed.value), "Agregado a la despensa.");
}

export async function setStockAction(
  foodId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(stockSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  return outcome(await setStock(user.id, uuid.parse(foodId), parsed.value), "Despensa ajustada.");
}

export async function saveMealSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(mealSettingsSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  return outcome(await saveMealSettings(user.id, parsed.value), "Preferencias guardadas.");
}

// ---------------------------------------------------------------------------
// Meals of the day
// ---------------------------------------------------------------------------

function target(blockId: string, date: string): MealTarget {
  return mealTargetSchema.parse({ blockId, date });
}

/** Rows `items.<n>.foodId` / `items.<n>.servings` of the "what to eat" form. */
function parseItems(formData: FormData) {
  const parsed = mealItemsSchema.safeParse(formRows(formData, "items"));
  if (parsed.success) return { ok: true as const, value: parsed.data };
  const fieldErrors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    fieldErrors[["items", ...issue.path].join(".")] ??= issue.message;
  }
  return { ok: false as const, error: invalid("Revisa las comidas marcadas.", fieldErrors) };
}

export async function planMealAction(
  blockId: string,
  date: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const items = parseItems(formData);
  if (!items.ok) return items.error;
  const user = await requireUser();
  return outcome(await planMeal(user.id, target(blockId, date), items.value), "Plan guardado.");
}

export async function clearPlanAction(
  blockId: string,
  date: string,
  _prev: ActionState,
): Promise<ActionState> {
  const user = await requireUser();
  return outcome(await clearPlan(user.id, target(blockId, date)), "Plan borrado.");
}

/** "Sí, lo comí": eats what was planned. */
export async function eatPlannedAction(
  blockId: string,
  date: string,
  _prev: ActionState,
): Promise<ActionState> {
  const user = await requireUser();
  return outcome(
    await eatMeal(user.id, target(blockId, date), undefined, today(user.timezone)),
    "Marcado como comido.",
  );
}

/** "¿Qué comiste?" or "Comí otra cosa": eats these items instead of the plan. */
export async function eatMealAction(
  blockId: string,
  date: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const items = parseItems(formData);
  if (!items.ok) return items.error;
  const user = await requireUser();
  return outcome(
    await eatMeal(user.id, target(blockId, date), items.value, today(user.timezone)),
    "Marcado como comido.",
  );
}

export async function undoMealAction(
  blockId: string,
  date: string,
  _prev: ActionState,
): Promise<ActionState> {
  const user = await requireUser();
  return outcome(await undoMeal(user.id, target(blockId, date)), "Marcado como no comido.");
}
