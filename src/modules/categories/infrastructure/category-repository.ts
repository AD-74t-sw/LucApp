import type { Category as CategoryRow } from "@/generated/prisma/client";
import { type Db, isForeignKeyViolation, prisma } from "@/shared/infrastructure";
import type { Category, CategoryKind, CostType, Necessity } from "../domain/category";
import type { CategorySeed } from "../domain/default-categories";

function toDomain(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    color: row.color,
    parentId: row.parentId,
    defaultCostType: row.defaultCostType,
    defaultNecessity: row.defaultNecessity,
    archived: row.archivedAt !== null,
  };
}

export type CategoryData = {
  name: string;
  color: string;
  parentId: string | null;
  defaultCostType: CostType | null;
  defaultNecessity: Necessity | null;
};

export const categoryRepository = {
  async list(userId: string, options: { includeArchived?: boolean; kind?: CategoryKind } = {}) {
    const rows = await prisma.category.findMany({
      where: {
        userId,
        ...(options.includeArchived ? {} : { archivedAt: null }),
        ...(options.kind ? { kind: options.kind } : {}),
      },
      orderBy: { name: "asc" },
    });
    return rows.map(toDomain);
  },

  async findById(userId: string, id: string, db: Db = prisma): Promise<Category | null> {
    const row = await db.category.findFirst({ where: { id, userId } });
    return row ? toDomain(row) : null;
  },

  async existsWithName(userId: string, name: string, parentId: string | null, exceptId?: string) {
    const count = await prisma.category.count({
      where: {
        userId,
        parentId,
        name: { equals: name, mode: "insensitive" },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });
    return count > 0;
  },

  async hasChildren(userId: string, id: string): Promise<boolean> {
    return (await prisma.category.count({ where: { userId, parentId: id } })) > 0;
  },

  async create(userId: string, kind: CategoryKind, data: CategoryData): Promise<Category> {
    return toDomain(await prisma.category.create({ data: { userId, kind, ...data } }));
  },

  /** Updates the category; subcategories follow their parent's color in the same transaction. */
  async update(userId: string, id: string, data: CategoryData): Promise<Category> {
    await prisma.$transaction([
      prisma.category.updateMany({ where: { id, userId }, data }),
      prisma.category.updateMany({ where: { userId, parentId: id }, data: { color: data.color } }),
    ]);
    return toDomain(await prisma.category.findFirstOrThrow({ where: { id, userId } }));
  },

  async setArchived(userId: string, id: string, archived: boolean): Promise<void> {
    await prisma.category.updateMany({
      where: { userId, OR: [{ id }, { parentId: id }] },
      data: { archivedAt: archived ? new Date() : null },
    });
  },

  /**
   * Deletes the category unless something references it (movements, plans or
   * subcategories). The foreign keys use ON DELETE RESTRICT, so the database
   * is the one enforcing it.
   */
  async delete(userId: string, id: string): Promise<"deleted" | "in_use"> {
    try {
      await prisma.category.deleteMany({ where: { id, userId } });
      return "deleted";
    } catch (error) {
      if (isForeignKeyViolation(error)) return "in_use";
      throw error;
    }
  },

  async createTree(userId: string, seeds: readonly CategorySeed[], db: Db = prisma): Promise<void> {
    for (const seed of seeds) {
      await db.category.create({
        data: {
          userId,
          name: seed.name,
          kind: seed.kind,
          color: seed.color,
          defaultCostType: seed.costType ?? null,
          defaultNecessity: seed.necessity ?? null,
          children: {
            create: (seed.children ?? []).map((child) => ({
              user: { connect: { id: userId } },
              name: child.name,
              kind: seed.kind,
              color: seed.color,
              defaultCostType: child.costType ?? null,
              defaultNecessity: child.necessity ?? null,
            })),
          },
        },
      });
    }
  },
};
