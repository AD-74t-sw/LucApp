import { type Result, conflict, notFound, ok } from "@/shared/domain";
import type { Db } from "@/shared/infrastructure";
import { type Category, categoryColor, validateParent } from "../domain/category";
import { DEFAULT_CATEGORIES } from "../domain/default-categories";
import { type CategoryData, categoryRepository } from "../infrastructure/category-repository";
import type { CreateCategoryInput, UpdateCategoryInput } from "./category-schemas";

function toData(input: UpdateCategoryInput, parent: Category | null): CategoryData {
  return {
    name: input.name,
    color: categoryColor(input.color, parent),
    parentId: input.parentId ?? null,
    defaultCostType: input.defaultCostType ?? null,
    defaultNecessity: input.defaultNecessity ?? null,
  };
}

async function loadParent(userId: string, parentId: string | undefined) {
  if (!parentId) return ok(null);
  const parent = await categoryRepository.findById(userId, parentId);
  return parent ? ok(parent) : notFound("La categoría principal");
}

export async function createCategory(
  userId: string,
  input: CreateCategoryInput,
): Promise<Result<Category>> {
  const parent = await loadParent(userId, input.parentId);
  if (!parent.ok) return parent;
  const valid = validateParent(input.kind, parent.value);
  if (!valid.ok) return valid;
  if (await categoryRepository.existsWithName(userId, input.name, input.parentId ?? null)) {
    return conflict("Ya tienes una categoría con ese nombre en ese nivel.", "name");
  }
  return ok(await categoryRepository.create(userId, input.kind, toData(input, parent.value)));
}

export async function updateCategory(
  userId: string,
  id: string,
  input: UpdateCategoryInput,
): Promise<Result<Category>> {
  const current = await categoryRepository.findById(userId, id);
  if (!current) return notFound("La categoría");
  const parent = await loadParent(userId, input.parentId);
  if (!parent.ok) return parent;
  const valid = validateParent(current.kind, parent.value, {
    selfId: id,
    selfHasChildren: parent.value !== null && (await categoryRepository.hasChildren(userId, id)),
  });
  if (!valid.ok) return valid;
  if (await categoryRepository.existsWithName(userId, input.name, input.parentId ?? null, id)) {
    return conflict("Ya tienes una categoría con ese nombre en ese nivel.", "name");
  }
  return ok(await categoryRepository.update(userId, id, toData(input, parent.value)));
}

/** Archived categories disappear from forms but keep their history. Archiving a parent archives its children. */
export async function setCategoryArchived(
  userId: string,
  id: string,
  archived: boolean,
): Promise<Result<void>> {
  const current = await categoryRepository.findById(userId, id);
  if (!current) return notFound("La categoría");
  await categoryRepository.setArchived(userId, id, archived);
  return ok();
}

export async function deleteCategory(userId: string, id: string): Promise<Result<void>> {
  const current = await categoryRepository.findById(userId, id);
  if (!current) return notFound("La categoría");
  const outcome = await categoryRepository.delete(userId, id);
  if (outcome === "in_use") {
    return conflict(
      "La categoría tiene movimientos o subcategorías. Archívala en lugar de eliminarla.",
    );
  }
  return ok();
}

export async function createDefaultCategories(userId: string, db?: Db): Promise<void> {
  await categoryRepository.createTree(userId, DEFAULT_CATEGORIES, db);
}
