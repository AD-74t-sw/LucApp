import type { Db } from "@/shared/infrastructure";
import { type Category, type CategoryKind, buildTree } from "../domain/category";
import { categoryRepository } from "../infrastructure/category-repository";

export function listCategories(
  userId: string,
  options: { includeArchived?: boolean; kind?: CategoryKind } = {},
): Promise<Category[]> {
  return categoryRepository.list(userId, options);
}

export async function getCategoryTree(
  userId: string,
  options: { includeArchived?: boolean; kind?: CategoryKind } = {},
) {
  return buildTree(await categoryRepository.list(userId, options));
}

export function getCategory(userId: string, id: string, db?: Db): Promise<Category | null> {
  return categoryRepository.findById(userId, id, db);
}

/** Category plus its parent, used to resolve classification defaults. */
export async function getCategoryWithParent(userId: string, id: string, db?: Db) {
  const category = await categoryRepository.findById(userId, id, db);
  if (!category) return null;
  const parent = category.parentId
    ? await categoryRepository.findById(userId, category.parentId, db)
    : null;
  return { category, parent };
}
