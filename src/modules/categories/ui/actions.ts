"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/modules/identity";
import type { ActionState } from "@/shared/ui/action-state";
import { errorState, parseForm } from "@/shared/ui/server/form";
import { createCategorySchema, updateCategorySchema } from "../application/category-schemas";
import {
  createCategory,
  deleteCategory,
  ensureDefaultCategories,
  setCategoryArchived,
  updateCategory,
} from "../application/manage-categories";

export async function createCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(createCategorySchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await createCategory(user.id, parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  redirect("/categories");
}

export async function updateCategoryAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(updateCategorySchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await updateCategory(user.id, z.uuid().parse(id), parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  redirect("/categories");
}

export async function toggleCategoryArchivedAction(
  id: string,
  archived: boolean,
  _prev: ActionState,
): Promise<ActionState> {
  const user = await requireUser();
  const result = await setCategoryArchived(user.id, z.uuid().parse(id), archived);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return {
    status: "success",
    message: archived ? "Categoría archivada." : "Categoría restaurada.",
  };
}

/** "Agregar categorías sugeridas", for an account that has none. */
export async function addDefaultCategoriesAction(_prev: ActionState): Promise<ActionState> {
  const user = await requireUser();
  const result = await ensureDefaultCategories(user.id);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return { status: "success", message: "Categorías sugeridas agregadas." };
}

export async function deleteCategoryAction(id: string, _prev: ActionState): Promise<ActionState> {
  const user = await requireUser();
  const result = await deleteCategory(user.id, z.uuid().parse(id));
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  redirect("/categories");
}
